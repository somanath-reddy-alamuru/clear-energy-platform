
import { AppError } from "../utils/AppError.js";
import * as contractsRepo from "../repositories/contractsRepository.js";
import * as customersRepo from "../repositories/customersRepository.js";
import * as sitesRepo from "../repositories/sitesRepository.js";
import * as metersRepo from "../repositories/metersRepository.js";

const fields = [
  "contractCode",
  "customerId",
  "siteId",
  "meterId",
  "serviceType",
  "ratePerUnit",
  "currency",
  "startDate",
  "endDate",
  "status",
];

const requiredFields = [
  "contractCode",
  "customerId",
  "siteId",
  "meterId",
  "serviceType",
  "ratePerUnit",
  "startDate",
  "status",
];

const statuses = ["Active", "Inactive", "Expired"];
const serviceTypes = ["Steam", "Thermal Energy", "Bulk LPG"];

function parseId(value, label) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id < 1) {
    throw new AppError(400, `${label} must be a positive integer`);
  }

  return id;
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

function validatePayload(payload, requireAll = false) {
  if (!payload || typeof payload !== "object" ||
      Array.isArray(payload)) {
    throw new AppError(400, "Request body must be a JSON object");
  }

  const supplied = Object.keys(payload);

  if (!supplied.length) {
    throw new AppError(400, "Request body cannot be empty");
  }

  const unknown = supplied.filter((field) => !fields.includes(field));

  if (unknown.length) {
    throw new AppError(
      400,
      `Unsupported fields: ${unknown.join(", ")}`
    );
  }

  if (requireAll) {
    const missing = requiredFields.filter(
      (field) => !Object.hasOwn(payload, field)
    );

    if (missing.length) {
      throw new AppError(
        400,
        `Missing fields: ${missing.join(", ")}`
      );
    }
  }

  const data = {};

  for (const field of supplied) {
    const value = payload[field];

    if (field === "endDate") {
      if (value === null || value === "") {
        data.endDate = null;
      } else if (validDate(value)) {
        data.endDate = value;
      } else {
        throw new AppError(400, "endDate must use YYYY-MM-DD");
      }
      continue;
    }

    if (["customerId", "siteId", "meterId"].includes(field)) {
      data[field] = parseId(value, field);
      continue;
    }

    if (field === "ratePerUnit") {
      const rate = Number(value);

      if (!Number.isFinite(rate) || rate <= 0 || rate > 1_000_000_000) {
        throw new AppError(400, "Rate per unit must be positive");
      }

      data.ratePerUnit = rate;
      continue;
    }

    if (["contractCode", "serviceType", "currency", "status"].includes(field)) {
      if (typeof value !== "string" || !value.trim()) {
        throw new AppError(400, `${field} must be a non-empty string`);
      }

      data[field] = value.trim();
      continue;
    }

    if (field === "startDate") {
      if (!validDate(value)) {
        throw new AppError(400, "startDate must use YYYY-MM-DD");
      }

      data.startDate = value;
    }
  }

  if (data.contractCode && data.contractCode.length > 60) {
    throw new AppError(400, "Contract code cannot exceed 60 characters");
  }

  if (data.serviceType && !serviceTypes.includes(data.serviceType)) {
    throw new AppError(400, "Invalid service type");
  }

  if (data.currency && !/^[A-Z]{3}$/.test(data.currency)) {
    throw new AppError(400, "Currency must be a three-letter code");
  }

  if (data.status && !statuses.includes(data.status)) {
    throw new AppError(400, "Invalid contract status");
  }

  if (
    data.startDate &&
    data.endDate &&
    data.endDate < data.startDate
  ) {
    throw new AppError(400, "End date cannot precede start date");
  }

  return data;
}

async function validateRelationships(data) {
  const [customer, site, meter] = await Promise.all([
    customersRepo.findById(data.customerId),
    sitesRepo.findById(data.siteId),
    metersRepo.findById(data.meterId),
  ]);

  if (!customer) throw new AppError(400, "Customer not found");
  if (!site) throw new AppError(400, "Site not found");
  if (!meter) throw new AppError(400, "Meter not found");

  if (site.customerId !== customer.id) {
    throw new AppError(
      400,
      "The selected customer does not own the selected site"
    );
  }

  if (meter.siteId !== site.id) {
    throw new AppError(
      400,
      "The selected meter does not belong to the selected site"
    );
  }

  if (meter.meterType !== data.serviceType) {
    throw new AppError(
      400,
      "Service type must match the selected meter type"
    );
  }
}

async function handleDbError(operation) {
  try {
    return await operation();
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new AppError(409, "This contract code already exists");
    }

    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_ROW_IS_REFERENCED"
    ) {
      throw new AppError(
        409,
        "This contract has invoices and cannot be deleted"
      );
    }

    throw error;
  }
}

export async function getAllContracts() {
  return contractsRepo.findAll();
}

export async function getContractById(rawId) {
  const id = parseId(rawId, "Contract ID");
  const contract = await contractsRepo.findById(id);

  if (!contract) throw new AppError(404, "Contract not found");

  return contract;
}

export async function createContract(payload) {
  const data = validatePayload(
    { currency: "INR", status: "Active", ...payload },
    true
  );

  await validateRelationships(data);

  return handleDbError(() => contractsRepo.create(data));
}

export async function replaceContract(rawId, payload) {
  const id = parseId(rawId, "Contract ID");
  const data = validatePayload(payload, true);

  await validateRelationships(data);

  const contract = await handleDbError(
    () => contractsRepo.replaceById(id, data)
  );

  if (!contract) throw new AppError(404, "Contract not found");

  return contract;
}

export async function patchContract(rawId, payload) {
  const id = parseId(rawId, "Contract ID");
  const existing = await contractsRepo.findById(id);

  if (!existing) throw new AppError(404, "Contract not found");

  const updates = validatePayload(payload);
  const merged = validatePayload(
    { ...existing, ...updates },
    true
  );

  await validateRelationships(merged);

  const contract = await handleDbError(
    () => contractsRepo.replaceById(id, merged)
  );

  return contract;
}

export async function deleteContract(rawId) {
  const id = parseId(rawId, "Contract ID");

  const contract = await handleDbError(
    () => contractsRepo.deleteById(id)
  );

  if (!contract) throw new AppError(404, "Contract not found");

  return contract;
}
