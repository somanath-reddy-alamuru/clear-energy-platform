
import { pool } from "../db/pool.js";

const selectContracts = `
  SELECT
    c.id,
    c.contract_code,
    c.customer_id,
    cu.company_name AS customer_name,
    c.site_id,
    s.name AS site_name,
    c.meter_id,
    m.meter_code,
    m.meter_name,
    m.unit AS meter_unit,
    c.service_type,
    c.rate_per_unit,
    c.currency,
    DATE_FORMAT(c.start_date, '%Y-%m-%d') AS start_date,
    DATE_FORMAT(c.end_date, '%Y-%m-%d') AS end_date,
    c.status
  FROM contracts c
  JOIN customers cu ON cu.id = c.customer_id
  JOIN sites s ON s.id = c.site_id
  JOIN meters m ON m.id = c.meter_id
`;

function mapContract(row) {
  if (!row) return null;

  return {
    id: Number(row.id),
    contractCode: row.contract_code,
    customerId: Number(row.customer_id),
    customerName: row.customer_name,
    siteId: Number(row.site_id),
    siteName: row.site_name,
    meterId: Number(row.meter_id),
    meterCode: row.meter_code,
    meterName: row.meter_name,
    meterUnit: row.meter_unit,
    serviceType: row.service_type,
    ratePerUnit: Number(row.rate_per_unit),
    currency: row.currency,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
  };
}

export async function findAll() {
  const [rows] = await pool.execute(
    `${selectContracts} ORDER BY c.id DESC`
  );

  return rows.map(mapContract);
}

export async function findById(id) {
  const [rows] = await pool.execute(
    `${selectContracts} WHERE c.id = ?`,
    [id]
  );

  return rows.length ? mapContract(rows[0]) : null;
}

export async function create(data) {
  const [result] = await pool.execute(
    `INSERT INTO contracts (
      contract_code, customer_id, site_id, meter_id,
      service_type, rate_per_unit, currency,
      start_date, end_date, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.contractCode,
      data.customerId,
      data.siteId,
      data.meterId,
      data.serviceType,
      data.ratePerUnit,
      data.currency ?? "INR",
      data.startDate,
      data.endDate || null,
      data.status,
    ]
  );

  return findById(result.insertId);
}

export async function replaceById(id, data) {
  if (!(await findById(id))) return null;

  await pool.execute(
    `UPDATE contracts
     SET contract_code = ?,
         customer_id = ?,
         site_id = ?,
         meter_id = ?,
         service_type = ?,
         rate_per_unit = ?,
         currency = ?,
         start_date = ?,
         end_date = ?,
         status = ?
     WHERE id = ?`,
    [
      data.contractCode,
      data.customerId,
      data.siteId,
      data.meterId,
      data.serviceType,
      data.ratePerUnit,
      data.currency ?? "INR",
      data.startDate,
      data.endDate || null,
      data.status,
      id,
    ]
  );

  return findById(id);
}

export async function deleteById(id) {
  const existing = await findById(id);
  if (!existing) return null;

  await pool.execute(
    "DELETE FROM contracts WHERE id = ?",
    [id]
  );

  return existing;
}
