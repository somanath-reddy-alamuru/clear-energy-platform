
import { Router } from "express";
import * as controller from "../controllers/contractsController.js";

const router = Router();

router.get("/", controller.getAllContracts);
router.get("/:id", controller.getContractById);
router.post("/", controller.createContract);
router.put("/:id", controller.replaceContract);
router.patch("/:id", controller.patchContract);
router.delete("/:id", controller.deleteContract);

export default router;
