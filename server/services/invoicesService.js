
import { AppError } from "../utils/AppError.js";
import * as invoicesRepo from "../repositories/invoicesRepository.js";
import * as contractsRepo from "../repositories/contractsRepository.js";
import * as readingsRepo from "../repositories/meterReadingsRepository.js";

function parseId(value) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id < 1) {
    throw new AppError(400, "ID must be a positive integer");
  }

  return id;
}

function normalizeDateTime(value, fieldName) {
  if (typeof value !== "string") {
    throw new AppError(400, `${fieldName} is required`);
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
      value.trim()
    );

  if (!match) {
    throw new AppError(
      400,
      `${fieldName} must use YYYY-MM-DDTHH:mm:ss format`
    );
  }

  const [, y, mo, d, h, mi, se = "0"] = match;
  const date = new Date(
    Date.UTC(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(se)
    )
  );

  if (
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() + 1 !== Number(mo) ||
    date.getUTCDate() !== Number(d) ||
    date.getUTCHours() !== Number(h) ||
    date.getUTCMinutes() !== Number(mi) ||
    date.getUTCSeconds() !== Number(se)
  ) {
    throw new AppError(400, `${fieldName} is invalid`);
  }

  return `${y}-${mo}-${d} ${h}:${mi}:${String(se).padStart(2, "0")}`;
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validDate(value) {
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

export async function getAllInvoices() {
  return invoicesRepo.findAll();
}

export async function getInvoiceById(rawId) {
  const id = parseId(rawId);
  const invoice = await invoicesRepo.findById(id);

  if (!invoice) throw new AppError(404, "Invoice not found");

  return invoice;
}

export async function createInvoice(payload) {
  if (!payload || typeof payload !== "object" ||
      Array.isArray(payload)) {
    throw new AppError(400, "Request body must be an object");
  }

  const allowed = [
    "contractId",
    "periodStart",
    "periodEnd",
    "dueDate",
    "taxRate",
  ];

  const unknown = Object.keys(payload).filter(
    (key) => !allowed.includes(key)
  );

  if (unknown.length) {
    throw new AppError(400, `Unsupported fields: ${unknown.join(", ")}`);
  }

  const contractId = parseId(payload.contractId);
  const periodStart = normalizeDateTime(
    payload.periodStart,
    "periodStart"
  );
  const periodEnd = normalizeDateTime(
    payload.periodEnd,
    "periodEnd"
  );

  if (periodEnd <= periodStart) {
    throw new AppError(400, "Invoice period end must be after its start");
  }

  if (!validDate(payload.dueDate)) {
    throw new AppError(400, "dueDate must use YYYY-MM-DD");
  }

  if (payload.dueDate < periodEnd.slice(0, 10)) {
    throw new AppError(
      400,
      "Due date cannot be before the end of the billing period"
    );
  }

  const taxRate = Number(payload.taxRate ?? 0);

  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 28) {
    throw new AppError(400, "Tax rate must be between 0 and 28 percent");
  }

  const contract = await contractsRepo.findById(contractId);

  if (!contract) throw new AppError(404, "Contract not found");

  if (contract.status !== "Active") {
    throw new AppError(409, "Invoices require an active contract");
  }

  if (periodStart.slice(0, 10) < contract.startDate) {
    throw new AppError(
      400,
      "Billing period cannot start before the contract"
    );
  }

  if (
    contract.endDate &&
    periodEnd.slice(0, 10) > contract.endDate
  ) {
    throw new AppError(
      400,
      "Billing period cannot extend beyond the contract end date"
    );
  }

  const opening = await readingsRepo.findLatestAtOrBefore(
    contract.meterId,
    periodStart
  );

  const closing = await readingsRepo.findLatestAtOrBefore(
    contract.meterId,
    periodEnd
  );

  if (!opening || !closing) {
    throw new AppError(
      422,
      "Insufficient meter readings for the selected invoice period"
    );
  }

  if (closing.readingAt <= opening.readingAt) {
    throw new AppError(
      422,
      "A later cumulative reading is required within the billing period"
    );
  }

  if (closing.readingValue < opening.readingValue) {
    throw new AppError(
      409,
      "Cumulative readings cannot decrease"
    );
  }

  const consumption = Number(
    (closing.readingValue - opening.readingValue).toFixed(3)
  );

  const subtotal = roundMoney(
    consumption * contract.ratePerUnit
  );

  const taxAmount = roundMoney(
    subtotal * taxRate / 100
  );

  const totalAmount = roundMoney(subtotal + taxAmount);

  try {
    return await invoicesRepo.create({
      contractId: contract.id,
      customerId: contract.customerId,
      siteId: contract.siteId,
      meterId: contract.meterId,
      periodStart,
      periodEnd,
      openingReading: opening.readingValue,
      closingReading: closing.readingValue,
      consumption,
      unit: contract.meterUnit,
      ratePerUnit: contract.ratePerUnit,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      dueDate: payload.dueDate,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new AppError(
        409,
        "An invoice already exists for this contract and billing period"
      );
    }

    throw error;
  }
}

export async function changeInvoiceStatus(rawId, newStatus) {
  const id = parseId(rawId);

  if (!["Issued", "Paid", "Void"].includes(newStatus)) {
    throw new AppError(
      400,
      "Allowed status changes are Issued, Paid or Void"
    );
  }

  const invoice = await invoicesRepo.findById(id);

  if (!invoice) throw new AppError(404, "Invoice not found");

  const allowedTransitions = {
    Draft: ["Issued", "Void"],
    Issued: ["Paid", "Void"],
    Paid: [],
    Void: [],
  };

  if (!allowedTransitions[invoice.status].includes(newStatus)) {
    throw new AppError(
      409,
      `Invoice cannot transition from ${invoice.status} to ${newStatus}`
    );
  }

  return invoicesRepo.updateStatus(id, newStatus);
}
