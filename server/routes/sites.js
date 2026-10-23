
import { Router } from "express";
import { sites } from "../data/sites.js";

const router = Router();

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

// Validate site details submitted by the client.
// For PUT, every editable field is required.
// For PATCH, only the submitted fields are required.
function validateSitePayload(payload, requireAllFields = false) {
  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return "Request body must be a JSON object";
  }

  const fields = Object.keys(payload);

  if (fields.length === 0) {
    return "Request body cannot be empty";
  }

  const unknownFields = fields.filter(
    (field) => !editableFields.includes(field)
  );

  if (unknownFields.length > 0) {
    return `Unsupported fields: ${unknownFields.join(", ")}`;
  }

  if (requireAllFields) {
    const missingFields = editableFields.filter(
      (field) => !Object.hasOwn(payload, field)
    );

    if (missingFields.length > 0) {
      return `Missing fields: ${missingFields.join(", ")}`;
    }
  }

  for (const field of fields) {
    if (
      typeof payload[field] !== "string" ||
      payload[field].trim().length === 0
    ) {
      return `${field} must be a non-empty string`;
    }
  }

  if (
    payload.status !== undefined &&
    !allowedStatuses.includes(payload.status)
  ) {
    return "Invalid site status";
  }

  if (
    payload.serviceType !== undefined &&
    !allowedServiceTypes.includes(payload.serviceType)
  ) {
    return "Invalid service type";
  }

  return null;
}

// GET /api/sites
// Retrieve all sites.
router.get("/", (req, res) => {
  return res.status(200).json({
    count: sites.length,
    data: sites
  });
});

// GET /api/sites/:id
// Retrieve one site.
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      error: "Site ID must be a positive integer"
    });
  }

  const site = sites.find((item) => item.id === id);

  if (!site) {
    return res.status(404).json({
      error: "Site not found"
    });
  }

  return res.status(200).json({
    data: site
  });
});

// POST /api/sites
// Create a new site.
router.post("/", (req, res) => {
  const error = validateSitePayload(req.body, true);

  if (error) {
    return res.status(400).json({ error });
  }

  const nextId =
    sites.length === 0
      ? 1
      : Math.max(...sites.map((site) => site.id)) + 1;

  const newSite = {
    id: nextId,
    ...req.body
  };

  sites.push(newSite);

  return res.status(201).json({
    message: "Site created successfully",
    data: newSite
  });
});

// PUT /api/sites/:id
// Replace all editable site details.
router.put("/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      error: "Site ID must be a positive integer"
    });
  }

  const site = sites.find((item) => item.id === id);

  if (!site) {
    return res.status(404).json({
      error: "Site not found"
    });
  }

  const error = validateSitePayload(req.body, true);

  if (error) {
    return res.status(400).json({ error });
  }

  Object.assign(site, req.body);

  return res.status(200).json({
    message: "Site replaced successfully",
    data: site
  });
});

// PATCH /api/sites/:id
// Update only the fields provided.
router.patch("/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      error: "Site ID must be a positive integer"
    });
  }

  const site = sites.find((item) => item.id === id);

  if (!site) {
    return res.status(404).json({
      error: "Site not found"
    });
  }

  const error = validateSitePayload(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  Object.assign(site, req.body);

  return res.status(200).json({
    message: "Site updated successfully",
    data: site
  });
});

// DELETE /api/sites/:id
// Delete a site.
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      error: "Site ID must be a positive integer"
    });
  }

  const index = sites.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({
      error: "Site not found"
    });
  }

  const deletedSite = sites.splice(index, 1)[0];

  return res.status(200).json({
    message: "Site deleted successfully",
    data: deletedSite
  });
});

export default router;
