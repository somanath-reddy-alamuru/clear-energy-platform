
import { Router } from "express";
import { sites } from "../data/sites.js";

const router = Router();

// GET /api/sites
// Return all industrial sites.
router.get("/", (req, res) => {
  return res.status(200).json({
    count: sites.length,
    data: sites
  });
});

// GET /api/sites/:id
// Return one industrial site.
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

export default router;
