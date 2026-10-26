
import * as service from "../services/contractsService.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const getAllContracts = asyncHandler(async (req, res) => {
  const data = await service.getAllContracts();
  res.status(200).json({ count: data.length, data });
});

export const getContractById = asyncHandler(async (req, res) => {
  const data = await service.getContractById(req.params.id);
  res.status(200).json({ data });
});

export const createContract = asyncHandler(async (req, res) => {
  const data = await service.createContract(req.body);
  res.status(201).json({ message: "Contract created", data });
});

export const replaceContract = asyncHandler(async (req, res) => {
  const data = await service.replaceContract(req.params.id, req.body);
  res.status(200).json({ message: "Contract updated", data });
});

export const patchContract = asyncHandler(async (req, res) => {
  const data = await service.patchContract(req.params.id, req.body);
  res.status(200).json({ message: "Contract updated", data });
});

export const deleteContract = asyncHandler(async (req, res) => {
  const data = await service.deleteContract(req.params.id);
  res.status(200).json({ message: "Contract deleted", data });
});
