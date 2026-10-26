
import { Router } from "express";
import * as controller from "../controllers/customersController.js";

const router = Router();

router.get("/", controller.getAllCustomers);
router.get("/:id", controller.getCustomerById);
router.post("/", controller.createCustomer);
router.put("/:id", controller.replaceCustomer);
router.patch("/:id", controller.patchCustomer);
router.delete("/:id", controller.deleteCustomer);

export default router;
