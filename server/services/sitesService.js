import { AppError } from "../utils/AppError.js";
import * as sitesRepository from "../repositories/sitesRepository.js";

const editableFields = [
  "name",
  "customerName",
  "location",
  "serviceType",
  "status"
];

const allowedStatuses = [
  "Active",
  "Commissioning",
  "Maintenance"
];

const allowedServiceTypes = [
  "Steam",
  "Thermal Energy",
  "Bulk LPG"
];

function parseSiteId(rawId) {
  const id = Number(rawId);

  if (!Number.isSafeInteger(id) || id < 1) {
    throw new AppError(400, "Site ID must be a positive integer");
  }

  return id;
}

function validateSitePayload(payload, requireAllFields = false) {
  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new AppError(400, "Request body must be a JSON object");
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

  if (requireAllFields) {
    const missingFields = editableFields.filter(
      (field) => !Object.hasOwn(payload, field)
    );

    if (missingFields.length > 0) {
      throw new AppError(
        400,
        `Missing fields: ${missingFields.join(", ")}`
      );
    }
  }

  const normalized = {};

  for (const field of fields) {
    const value = payload[field];

    if (typeof value !== "string" || value.trim().length === 0) {
      throw new AppError(
        400,
        `${field} must be a non-empty string`
      );
    }

    normalized[field] = value.trim();
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

export async function getAllSites() {
  return sitesRepository.findAll();
}

export async function getSiteById(rawId) {
  const id = parseSiteId(rawId);
  const site = sitesRepository.findById(id);

  if (!site) {
    throw new AppError(404, "Site not found");
  }

  return site;
}

export async function createSite(payload) {
  const siteData = validateSitePayload(payload, true);

  return sitesRepository.create(siteData);
}

export async function replaceSite(rawId, payload) {
  const id = parseSiteId(rawId);
  const siteData = validateSitePayload(payload, true);

  const site = sitesRepository.replaceById(id, siteData);

  if (!site) {
    throw new AppError(404, "Site not found");
  }

  return site;
}

export async function patchSite(rawId, payload) {
  const id = parseSiteId(rawId);
  const updates = validateSitePayload(payload);

  const site = sitesRepository.patchById(id, updates);

  if (!site) {
    throw new AppError(404, "Site not found");
  }

  return site;
}

export async function deleteSite(rawId) {
  const id = parseSiteId(rawId);
  const site = sitesRepository.deleteById(id);

  if (!site) {
    throw new AppError(404, "Site not found");
  }

  return site;
}