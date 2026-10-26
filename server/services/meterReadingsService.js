
import { AppError } from "../utils/AppError.js";
import * as metersRepository from "../repositories/metersRepository.js";
import * as readingsRepository from "../repositories/meterReadingsRepository.js";

function parseMeterId(rawId) {
  const id = Number(rawId);

  if (!Number.isSafeInteger(id) || id < 1) {
    throw new AppError(400, "Meter ID must be a positive integer");
  }

  return id;
}

function normalizeDateTime(value, fieldName = "readingAt") {
  if (typeof value !== "string") {
    throw new AppError(400, `${fieldName} must be a date and time`);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/
    .exec(value.trim());

  if (!match) {
    throw new AppError(
      400,
      `${fieldName} must use YYYY-MM-DDTHH:mm:ss format`
    );
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText ?? "0");

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  if (
    year < 1000 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > lastDay ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    throw new AppError(400, `${fieldName} is not a valid date and time`);
  }

  return `${yearText}-${monthText}-${dayText} ${hourText}:${minuteText}:${String(second).padStart(2, "0")}`;
}

function validateReadingPayload(payload) {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new AppError(400, "Request body must be a JSON object");
  }

  const allowedFields = ["readingValue", "readingAt", "notes"];

  const unknownFields = Object.keys(payload).filter(
    (field) => !allowedFields.includes(field)
  );

  if (unknownFields.length) {
    throw new AppError(
      400,
      `Unsupported fields: ${unknownFields.join(", ")}`
    );
  }

  const value = payload.readingValue;

  if (
    value === undefined ||
    value === null ||
    value === "" ||
    (typeof value !== "number" && typeof value !== "string")
  ) {
    throw new AppError(400, "readingValue must be a number");
  }

  const readingValue = Number(value);

  if (
    !Number.isFinite(readingValue) ||
    readingValue < 0 ||
    readingValue >= 1_000_000_000_000
  ) {
    throw new AppError(
      400,
      "readingValue must be non-negative and within the supported range"
    );
  }

  if (
    Math.abs(
      readingValue * 1000 - Math.round(readingValue * 1000)
    ) > 1e-7
  ) {
    throw new AppError(
      400,
      "readingValue supports at most three decimal places"
    );
  }

  const readingAt = normalizeDateTime(payload.readingAt);

  let notes = payload.notes ?? null;

  if (typeof notes === "string") {
    notes = notes.trim() || null;
  } else if (notes !== null) {
    throw new AppError(400, "notes must be a string or null");
  }

  if (notes && notes.length > 255) {
    throw new AppError(400, "notes cannot exceed 255 characters");
  }

  return { readingValue, readingAt, notes };
}

async function requireMeter(rawMeterId) {
  const meterId = parseMeterId(rawMeterId);
  const meter = await metersRepository.findById(meterId);

  if (!meter) {
    throw new AppError(404, "Meter not found");
  }

  return meter;
}

export async function getMeterReadings(rawMeterId) {
  const meter = await requireMeter(rawMeterId);

  return {
    meter,
    readings: await readingsRepository.findAllByMeterId(meter.id),
  };
}

export async function createMeterReading(rawMeterId, payload) {
  const meter = await requireMeter(rawMeterId);

  if (meter.status !== "Active") {
    throw new AppError(
      409,
      "Readings can only be recorded for active meters"
    );
  }

  const data = validateReadingPayload(payload);

  const duplicate = await readingsRepository.findByTimestamp(
    meter.id,
    data.readingAt
  );

  if (duplicate) {
    throw new AppError(
      409,
      "A reading already exists for this meter at that timestamp"
    );
  }

  const previous = await readingsRepository.findLatestAtOrBefore(
    meter.id,
    data.readingAt
  );

  const next = await readingsRepository.findEarliestAfter(
    meter.id,
    data.readingAt
  );

  if (
    previous &&
    data.readingValue < previous.readingValue
  ) {
    throw new AppError(
      409,
      "Reading cannot be lower than the previous cumulative reading"
    );
  }

  if (
    next &&
    data.readingValue > next.readingValue
  ) {
    throw new AppError(
      409,
      "Reading cannot exceed the next cumulative reading"
    );
  }

  try {
    return await readingsRepository.create(meter.id, data);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new AppError(
        409,
        "A reading already exists for this meter at that timestamp"
      );
    }

    throw error;
  }
}

export async function calculateConsumption(
  rawMeterId,
  rawFrom,
  rawTo
) {
  const meter = await requireMeter(rawMeterId);

  const from = normalizeDateTime(rawFrom, "from");
  const to = normalizeDateTime(rawTo, "to");

  if (from >= to) {
    throw new AppError(
      400,
      "The end time must be later than the start time"
    );
  }

  const startReading = await readingsRepository.findLatestAtOrBefore(
    meter.id,
    from
  );

  const endReading = await readingsRepository.findLatestAtOrBefore(
    meter.id,
    to
  );

  if (!startReading || !endReading) {
    throw new AppError(
      422,
      "Insufficient readings: a baseline reading at or before the start time and a later reading by the end time are required"
    );
  }

  if (endReading.readingAt <= startReading.readingAt) {
    throw new AppError(
      422,
      "No later reading exists in the selected period"
    );
  }

  const consumption = Number(
    (endReading.readingValue - startReading.readingValue).toFixed(3)
  );

  return {
    meterId: meter.id,
    meterCode: meter.meterCode,
    meterName: meter.meterName,
    unit: meter.unit,
    requestedPeriod: { from, to },
    startReading,
    endReading,
    consumption,
  };
}
