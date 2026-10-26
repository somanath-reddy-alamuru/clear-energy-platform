
import { pool } from "../db/pool.js";

const selectMeters = `
  SELECT
    m.id,
    m.site_id,
    m.meter_code,
    m.meter_name,
    m.meter_type,
    m.unit,
    m.status,
    s.name AS site_name,
    s.service_type AS site_service_type
  FROM meters m
  JOIN sites s ON s.id = m.site_id
`;

function mapMeter(row) {
  if (!row) return null;

  return {
    id: Number(row.id),
    siteId: Number(row.site_id),
    siteName: row.site_name,
    siteServiceType: row.site_service_type,
    meterCode: row.meter_code,
    meterName: row.meter_name,
    meterType: row.meter_type,
    unit: row.unit,
    status: row.status,
  };
}

export async function findAll() {
  const [rows] = await pool.execute(
    `${selectMeters} ORDER BY m.id`
  );

  return rows.map(mapMeter);
}

export async function findById(id) {
  const [rows] = await pool.execute(
    `${selectMeters} WHERE m.id = ?`,
    [id]
  );

  return rows.length ? mapMeter(rows[0]) : null;
}

export async function create(data) {
  const [result] = await pool.execute(
    `INSERT INTO meters
      (site_id, meter_code, meter_name, meter_type, unit, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.siteId,
      data.meterCode,
      data.meterName,
      data.meterType,
      data.unit,
      data.status,
    ]
  );

  return findById(result.insertId);
}

export async function replaceById(id, data) {
  const existing = await findById(id);
  if (!existing) return null;

  await pool.execute(
    `UPDATE meters
     SET site_id = ?,
         meter_code = ?,
         meter_name = ?,
         meter_type = ?,
         unit = ?,
         status = ?
     WHERE id = ?`,
    [
      data.siteId,
      data.meterCode,
      data.meterName,
      data.meterType,
      data.unit,
      data.status,
      id,
    ]
  );

  return findById(id);
}

export async function patchById(id, updates) {
  const existing = await findById(id);
  if (!existing) return null;

  const columnMap = {
    siteId: "site_id",
    meterCode: "meter_code",
    meterName: "meter_name",
    meterType: "meter_type",
    unit: "unit",
    status: "status",
  };

  const fields = Object.keys(updates);

  if (fields.length === 0) return existing;

  if (fields.some((field) => !Object.hasOwn(columnMap, field))) {
    throw new Error("Unsupported meter update field");
  }

  const assignments = fields
    .map((field) => `${columnMap[field]} = ?`)
    .join(", ");

  const values = fields.map((field) => updates[field]);

  await pool.execute(
    `UPDATE meters SET ${assignments} WHERE id = ?`,
    [...values, id]
  );

  return findById(id);
}

export async function deleteById(id) {
  const existing = await findById(id);
  if (!existing) return null;

  await pool.execute(
    "DELETE FROM meters WHERE id = ?",
    [id]
  );

  return existing;
}
