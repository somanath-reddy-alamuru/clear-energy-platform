import * as sitesService from "../services/sitesService.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const getAllSites = asyncHandler(async (req, res) => {
  const data = await sitesService.getAllSites();

  return res.status(200).json({
    count: data.length,
    data
  });
});

export const getSiteById = asyncHandler(async (req, res) => {
  const data = await sitesService.getSiteById(req.params.id);

  return res.status(200).json({ data });
});

export const createSite = asyncHandler(async (req, res) => {
  const data = await sitesService.createSite(req.body);

  return res.status(201).json({
    message: "Site created successfully",
    data
  });
});

export const replaceSite = asyncHandler(async (req, res) => {
  const data = await sitesService.replaceSite(
    req.params.id,
    req.body
  );

  return res.status(200).json({
    message: "Site replaced successfully",
    data
  });
});

export const patchSite = asyncHandler(async (req, res) => {
  const data = await sitesService.patchSite(
    req.params.id,
    req.body
  );

  return res.status(200).json({
    message: "Site updated successfully",
    data
  });
});

export const deleteSite = asyncHandler(async (req, res) => {
  const data = await sitesService.deleteSite(req.params.id);

  return res.status(200).json({
    message: "Site deleted successfully",
    data
  });
});