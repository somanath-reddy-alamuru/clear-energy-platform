
import * as service from "../services/meterReadingsService.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const getMeterReadings = asyncHandler(async (req, res) => {
  const result = await service.getMeterReadings(req.params.meterId);

  return res.status(200).json({
    meter: result.meter,
    count: result.readings.length,
    data: result.readings,
  });
});

export const createMeterReading = asyncHandler(async (req, res) => {
  const data = await service.createMeterReading(
    req.params.meterId,
    req.body
  );

  return res.status(201).json({
    message: "Meter reading recorded successfully",
    data,
  });
});

export const calculateConsumption = asyncHandler(async (req, res) => {
  const data = await service.calculateConsumption(
    req.params.meterId,
    req.query.from,
    req.query.to
  );

  return res.status(200).json({ data });
});
