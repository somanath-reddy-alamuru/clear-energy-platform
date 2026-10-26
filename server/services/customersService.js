
import { AppError } from "../utils/AppError.js";
import * as repo from "../repositories/customersRepository.js";

const allowedFields = [
  "companyName",
  "contactName",
  "email",
  "phone",
  "billingAddress",
  "status",
];

const optionalFields = [
  "contactName",
  "email",
  "phone",
  "billingAddress",
];

const allowedStatuses = ["Active", "Inactive"];

function parseId(value) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id < 1) {
    throw new AppError(400, "Customer ID must be a positive integer");
  }

  return id;
}

function validatePayload(payload, requireAll = false) {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new AppError(400, "Request body must be a JSON object");
  }

  const fields = Object.keys(payload);

  if (fields.length === 0) {
    throw new AppError(400, "Request body cannot be empty");
  }

  const unknown = fields.filter(
    (field) => !allowedFields.includes(field)
  );

  if (unknown.length) {
    throw new AppError(
      400,
      `Unsupported fields: ${unknown.join(", ")}`
    );
  }

  if (requireAll) {
    const missing = allowedFields.filter(
      (field) => !Object.hasOwn(payload, field)
    );

    if (missing.length) {
      throw new AppError(
        400,
        `Missing fields: ${missing.join(", ")}`
      );
    }
  }

  const result = {};

  for (const field of fields) {
    let value = payload[field];

    if (optionalFields.includes(field) && value === "") {
      value = null;
    }

    if (
      optionalFields.includes(field) &&
      value === null
    ) {
      result[field] = null;
      continue;
    }

    if (
      typeof value !== "string" ||
      value.trim().length === 0
    ) {
      throw new AppError(
        400,
        `${field} must be a non-empty string`
      );
    }

    result[field] = value.trim();
  }

  if (
    result.companyName !== undefined &&
    result.companyName.length > 120
  ) {
    throw new AppError(400, "Company name is too long");
  }

  if (
    result.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)
  ) {
    throw new AppError(400, "Enter a valid email address");
  }

  if (
    result.contactName &&
    result.contactName.length > 120
  ) {
    throw new AppError(400, "Contact name is too long");
  }

  if (
    result.phone &&
    result.phone.length > 30
  ) {
    throw new AppError(400, "Phone number is too long");
  }

  if (
    result.billingAddress &&
    result.billingAddress.length > 255
  ) {
    throw new AppError(400, "Billing address is too long");
  }

  if (
    result.status !== undefined &&
    !allowedStatuses.includes(result.status)
  ) {
    throw new AppError(400, "Status must be Active or Inactive");
  }

  return result;
}

async function handleDuplicate(operation) {
  try {
    return await operation();
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new AppError(
        409,
        "A customer with this company name or email already exists"
      );
    }

    throw error;
  }
}

export async function getAllCustomers() {
  return repo.findAll();
}

export async function getCustomerById(rawId) {
  const id = parseId(rawId);
  const customer = await repo.findById(id);

  if (!customer) {
    throw new AppError(404, "Customer not found");
  }

  return customer;
}

export async function createCustomer(payload) {
  const supplied = validatePayload(payload);

  if (!supplied.companyName) {
    throw new AppError(
      400,
      "Company name is required"
    );
  }

  const customerData = validatePayload(
    {
      companyName: supplied.companyName,
      contactName: supplied.contactName ?? null,
      email: supplied.email ?? null,
      phone: supplied.phone ?? null,
      billingAddress: supplied.billingAddress ?? null,
      status: supplied.status ?? "Active",
    },
    true
  );

  return handleDuplicate(
    () => repo.create(customerData)
  );
}

export async function replaceCustomer(rawId, payload) {
  const id = parseId(rawId);
  const customerData = validatePayload(payload, true);

  const customer = await handleDuplicate(
    () => repo.replaceById(id, customerData)
  );

  if (!customer) {
    throw new AppError(404, "Customer not found");
  }

  return customer;
}

export async function patchCustomer(rawId, payload) {
  const id = parseId(rawId);
  const updates = validatePayload(payload);

  const customer = await handleDuplicate(
    () => repo.patchById(id, updates)
  );

  if (!customer) {
    throw new AppError(404, "Customer not found");
  }

  return customer;
}

export async function deleteCustomer(rawId) {
  const id = parseId(rawId);
  const customer = await repo.deleteById(id);

  if (!customer) {
    throw new AppError(404, "Customer not found");
  }

  return customer;
}
