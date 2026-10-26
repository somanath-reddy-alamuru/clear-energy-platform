
import { AppError } from "../utils/AppError.js";
import * as sitesRepository from "../repositories/sitesRepository.js";
import * as customersRepository from "../repositories/customersRepository.js";

const editableFields = [
  "name",
  "customerName",
  "customerId",
  "location",
  "serviceType",
  "status",
];

const requiredFields = [
  "name",
  "location",
  "serviceType",
  "status",
];

const allowedStatuses = [
  "Active",
  "Commissioning",
  "Maintenance",
];

const allowedServiceTypes = [
  "Steam",
  "Thermal Energy",
  "Bulk LPG",
];

function parseSiteId(rawId) {
  const id = Number(rawId);

  if (!Number.isSafeInteger(id) || id < 1) {
    throw new AppError(
      400,
      "Site ID must be a positive integer"
    );
  }

  return id;
}

function validateSitePayload(payload, requireAllFields = false) {
  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new AppError(
      400,
      "Request body must be a JSON object"
    );
  }

  const fields = Object.keys(payload);

  if (fields.length === 0) {
    throw new AppError(400, "Request body cannot be empty");
  }

  const unknownFields = fields.filter(
    (field) => !editableFields.includes(field)
  );

  if (unknownFields.length > 0) {
    throw new AppError(
      400,
      `Unsupported fields: ${unknownFields.join(", ")}`
    );
  }

  if (
    payload.customerName !== undefined &&
    payload.customerId !== undefined
  ) {
    throw new AppError(
      400,
      "Send either customerName or customerId, not both"
    );
  }

  if (requireAllFields) {
    const missing = requiredFields.filter(
      (field) => !Object.hasOwn(payload, field)
    );

    if (missing.length > 0) {
      throw new AppError(
        400,
        `Missing fields: ${missing.join(", ")}`
      );
    }

    if (
      payload.customerName === undefined &&
      payload.customerId === undefined
    ) {
      throw new AppError(
        400,
        "A customerName or customerId is required"
      );
    }
  }

  const normalized = {};

  for (const field of fields) {
    const value = payload[field];

    if (field === "customerId") {
      const customerId = Number(value);

      if (
        !Number.isSafeInteger(customerId) ||
        customerId < 1
      ) {
        throw new AppError(
          400,
          "customerId must be a positive integer"
        );
      }

      normalized.customerId = customerId;
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

    normalized[field] = value.trim();
  }

  const maxLengths = {
    name: 120,
    customerName: 120,
    location: 200,
  };

  for (const [field, maxLength] of Object.entries(maxLengths)) {
    if (
      normalized[field] !== undefined &&
      normalized[field].length > maxLength
    ) {
      throw new AppError(400, `${field} is too long`);
    }
  }

  if (
    normalized.status !== undefined &&
    !allowedStatuses.includes(normalized.status)
  ) {
    throw new AppError(400, "Invalid site status");
  }

  if (
    normalized.serviceType !== undefined &&
    !allowedServiceTypes.includes(normalized.serviceType)
  ) {
    throw new AppError(400, "Invalid service type");
  }

  return normalized;
}

// Resolve a customer reference and check that the customer
// exists and is active before assigning a site to it.
async function resolveCustomerId(siteData) {
  let customer;

  if (siteData.customerId !== undefined) {
    customer = await customersRepository.findById(
      siteData.customerId
    );
  } else if (siteData.customerName !== undefined) {
    customer = await customersRepository.findByCompanyName(
      siteData.customerName
    );
  } else {
    throw new AppError(400, "A customer is required");
  }

  if (!customer) {
    throw new AppError(
      400,
      "Customer not found. Create the customer first."
    );
  }

  if (customer.status !== "Active") {
    throw new AppError(
      409,
      "A site cannot be assigned to an inactive customer"
    );
  }

  return customer.id;
}

export async function getAllSites() {
  return sitesRepository.findAll();
}

export async function getSiteById(rawId) {
  const id = parseSiteId(rawId);
  const site = await sitesRepository.findById(id);

  if (!site) {
    throw new AppError(404, "Site not found");
  }

  return site;
}

export async function createSite(payload) {
  const validated = validateSitePayload(payload, true);
  const customerId = await resolveCustomerId(validated);

  const { customerName, ...siteData } = validated;

  return sitesRepository.create({
    ...siteData,
    customerId,
  });
}

export async function replaceSite(rawId, payload) {
  const id = parseSiteId(rawId);
  const validated = validateSitePayload(payload, true);
  const customerId = await resolveCustomerId(validated);

  const { customerName, ...siteData } = validated;

  const site = await sitesRepository.replaceById(id, {
    ...siteData,
    customerId,
  });

  if (!site) {
    throw new AppError(404, "Site not found");
  }

  return site;
}

export async function patchSite(rawId, payload) {
  const id = parseSiteId(rawId);
  const updates = validateSitePayload(payload);

  if (
    updates.customerName !== undefined ||
    updates.customerId !== undefined
  ) {
    const customerId = await resolveCustomerId(updates);

    delete updates.customerName;
    updates.customerId = customerId;
  }

  const site = await sitesRepository.patchById(id, updates);

  if (!site) {
    throw new AppError(404, "Site not found");
  }

  return site;
}

export async function deleteSite(rawId) {
  const id = parseSiteId(rawId);
  const site = await sitesRepository.deleteById(id);

  if (!site) {
    throw new AppError(404, "Site not found");
  }

  return site;
}
