
import * as service from "../services/invoicesService.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const getAllInvoices = asyncHandler(async (req, res) => {
  const data = await service.getAllInvoices();
  res.status(200).json({ count: data.length, data });
});

export const getInvoiceById = asyncHandler(async (req, res) => {
  const data = await service.getInvoiceById(req.params.id);
  res.status(200).json({ data });
});

export const createInvoice = asyncHandler(async (req, res) => {
  const data = await service.createInvoice(req.body);
  res.status(201).json({ message: "Invoice generated", data });
});

export const changeInvoiceStatus = asyncHandler(async (req, res) => {
  const data = await service.changeInvoiceStatus(
    req.params.id,
    req.body.status
  );

  res.status(200).json({ message: "Invoice status updated", data });
});
