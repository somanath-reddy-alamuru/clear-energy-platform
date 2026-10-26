
import { Router } from "express";

import * as meters from "../controllers/metersController.js";
import * as readings from "../controllers/meterReadingsController.js";

const router = Router();

// Reading and consumption endpoints.
router.get("/:meterId/readings", readings.getMeterReadings);
router.post("/:meterId/readings", readings.createMeterReading);
router.get("/:meterId/consumption", readings.calculateConsumption);

// Meter CRUD endpoints.
router.get("/", meters.getAllMeters);
router.get("/:id", meters.getMeterById);
router.post("/", meters.createMeter);
router.put("/:id", meters.replaceMeter);
router.patch("/:id", meters.patchMeter);
router.delete("/:id", meters.deleteMeter);

export default router;
