
import * as service from "../services/metersService.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const getAllMeters = asyncHandler(async (req, res) => {
  const data = await service.getAllMeters();
  return res.status(200).json({ count: data.length, data });
});

export const getMeterById = asyncHandler(async (req, res) => {
  const data = await service.getMeterById(req.params.id);
  return res.status(200).json({ data });
});

export const createMeter = asyncHandler(async (req, res) => {
  const data = await service.createMeter(req.body);
  return res.status(201).json({
    message: "Meter registered successfully",
    data,
  });
});

export const replaceMeter = asyncHandler(async (req, res) => {
  const data = await service.replaceMeter(req.params.id, req.body);
  return res.status(200).json({
    message: "Meter updated successfully",
    data,
  });
});

export const patchMeter = asyncHandler(async (req, res) => {
  const data = await service.patchMeter(req.params.id, req.body);
  return res.status(200).json({
    message: "Meter updated successfully",
    data,
  });
});

export const deleteMeter = asyncHandler(async (req, res) => {
  const data = await service.deleteMeter(req.params.id);
  return res.status(200).json({
    message: "Meter deleted successfully",
    data,
  });
});
