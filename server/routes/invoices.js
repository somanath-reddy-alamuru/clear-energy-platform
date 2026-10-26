
import { Router } from "express";
import * as controller from "../controllers/invoicesController.js";

const router = Router();

router.get("/", controller.getAllInvoices);
router.get("/:id", controller.getInvoiceById);
router.post("/", controller.createInvoice);
router.patch("/:id", controller.changeInvoiceStatus);

export default router;
