
import { AppError } from "../utils/AppError.js";
import * as metersRepository from "../repositories/metersRepository.js";
import * as sitesRepository from "../repositories/sitesRepository.js";

const editableFields = [
  "siteId",
  "meterCode",
  "meterName",
  "meterType",
  "unit",
  "status",
];

const meterTypes = ["Steam", "Thermal Energy", "Bulk LPG"];

const allowedUnits = {
  Steam: ["kg", "tonnes"],
  "Thermal Energy": ["kWh"],
  "Bulk LPG": ["kg", "tonnes", "m3"],
};

const allowedStatuses = ["Active", "Maintenance", "Inactive"];

function parseId(value, label = "Meter ID") {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id < 1) {
    throw new AppError(
      400,
      `${label} must be a positive integer`
    );
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
    (field) => !editableFields.includes(field)
  );

  if (unknown.length) {
    throw new AppError(
      400,
      `Unsupported fields: ${unknown.join(", ")}`
    );
  }

  if (requireAll) {
    const missing = editableFields.filter(
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
    const value = payload[field];

    if (field === "siteId") {
      result.siteId = parseId(value, "Site ID");
      continue;
    }

    if (typeof value !== "string" || !value.trim()) {
      throw new AppError(
        400,
        `${field} must be a non-empty string`
      );
    }

    result[field] = value.trim();
  }

  if (
    result.meterCode !== undefined &&
    result.meterCode.length > 60
  ) {
    throw new AppError(400, "Meter code is too long");
  }

  if (
    result.meterName !== undefined &&
    result.meterName.length > 120
  ) {
    throw new AppError(400, "Meter name is too long");
  }

  if (
    result.meterType !== undefined &&
    !meterTypes.includes(result.meterType)
  ) {
    throw new AppError(400, "Invalid meter type");
  }

  if (
    result.status !== undefined &&
    !allowedStatuses.includes(result.status)
  ) {
    throw new AppError(400, "Invalid meter status");
  }

  if (
    result.unit !== undefined &&
    !["kg", "tonnes", "kWh", "m3"].includes(result.unit)
  ) {
    throw new AppError(400, "Invalid meter unit");
  }

  return result;
}

async function validateSiteCompatibility(data) {
  const site = await sitesRepository.findById(data.siteId);

  if (!site) {
    throw new AppError(404, "Site not found");
  }

  if (site.serviceType !== data.meterType) {
    throw new AppError(
      400,
      "Meter type must match the service type of its site"
    );
  }

  if (!allowedUnits[data.meterType]?.includes(data.unit)) {
    throw new AppError(
      400,
      `Unit ${data.unit} is not supported for ${data.meterType}`
    );
  }
}

async function handleDatabaseError(operation) {
  try {
    return await operation();
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new AppError(
        409,
        "A meter with this code already exists"
      );
    }

    if (
      error.code === "ER_NO_REFERENCED_ROW_2" ||
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_ROW_IS_REFERENCED"
    ) {
      throw new AppError(
        409,
        "The operation conflicts with an existing site or reading"
      );
    }

    throw error;
  }
}

export async function getAllMeters() {
  return metersRepository.findAll();
}

export async function getMeterById(rawId) {
  const id = parseId(rawId);
  const meter = await metersRepository.findById(id);

  if (!meter) {
    throw new AppError(404, "Meter not found");
  }

  return meter;
}

export async function createMeter(payload) {
  const data = validatePayload(
    {
      ...payload,
      status: payload?.status ?? "Active",
    },
    true
  );

  await validateSiteCompatibility(data);

  return handleDatabaseError(
    () => metersRepository.create(data)
  );
}

export async function replaceMeter(rawId, payload) {
  const id = parseId(rawId);
  const data = validatePayload(payload, true);

  await validateSiteCompatibility(data);

  const meter = await handleDatabaseError(
    () => metersRepository.replaceById(id, data)
  );

  if (!meter) {
    throw new AppError(404, "Meter not found");
  }

  return meter;
}

export async function patchMeter(rawId, payload) {
  const id = parseId(rawId);
  const existing = await metersRepository.findById(id);

  if (!existing) {
    throw new AppError(404, "Meter not found");
  }

  const updates = validatePayload(payload);

  const merged = {
    siteId: updates.siteId ?? existing.siteId,
    meterCode: updates.meterCode ?? existing.meterCode,
    meterName: updates.meterName ?? existing.meterName,
    meterType: updates.meterType ?? existing.meterType,
    unit: updates.unit ?? existing.unit,
    status: updates.status ?? existing.status,
  };

  await validateSiteCompatibility(merged);

  const meter = await handleDatabaseError(
    () => metersRepository.patchById(id, updates)
  );

  if (!meter) {
    throw new AppError(404, "Meter not found");
  }

  return meter;
}

export async function deleteMeter(rawId) {
  const id = parseId(rawId);

  const meter = await handleDatabaseError(
    () => metersRepository.deleteById(id)
  );

  if (!meter) {
    throw new AppError(404, "Meter not found");
  }

  return meter;
}
