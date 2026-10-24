import { Router } from "express";
import * as sitesController from "../controllers/sitesController.js";

const router = Router();

router.get("/", sitesController.getAllSites);
router.get("/:id", sitesController.getSiteById);

router.post("/", sitesController.createSite);
router.put("/:id", sitesController.replaceSite);
router.patch("/:id", sitesController.patchSite);
router.delete("/:id", sitesController.deleteSite);

export default router;