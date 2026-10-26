
import * as service from "../services/customersService.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const getAllCustomers = asyncHandler(async (req, res) => {
  const data = await service.getAllCustomers();

  return res.status(200).json({
    count: data.length,
    data,
  });
});

export const getCustomerById = asyncHandler(async (req, res) => {
  const data = await service.getCustomerById(req.params.id);

  return res.status(200).json({ data });
});

export const createCustomer = asyncHandler(async (req, res) => {
  const data = await service.createCustomer(req.body);

  return res.status(201).json({
    message: "Customer created successfully",
    data,
  });
});

export const replaceCustomer = asyncHandler(async (req, res) => {
  const data = await service.replaceCustomer(
    req.params.id,
    req.body
  );

  return res.status(200).json({
    message: "Customer updated successfully",
    data,
  });
});

export const patchCustomer = asyncHandler(async (req, res) => {
  const data = await service.patchCustomer(
    req.params.id,
    req.body
  );

  return res.status(200).json({
    message: "Customer updated successfully",
    data,
  });
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const data = await service.deleteCustomer(req.params.id);

  return res.status(200).json({
    message: "Customer deleted successfully",
    data,
  });
});
