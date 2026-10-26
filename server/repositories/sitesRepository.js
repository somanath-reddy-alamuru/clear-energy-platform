
import { pool } from "../db/pool.js";

// Preserve the current API field names while using MySQL
// columns and a real customer relationship.
function mapSite(row) {
  if (!row) return null;

  return {
    id: Number(row.id),
    name: row.name,
    customerId: Number(row.customer_id),
    customerName: row.customer_name,
    location: row.location,
    serviceType: row.service_type,
    status: row.status,
  };
}

const selectSites = `
  SELECT
    s.id,
    s.name,
    s.customer_id,
    c.company_name AS customer_name,
    s.location,
    s.service_type,
    s.status
  FROM sites s
  JOIN customers c ON c.id = s.customer_id
`;

export async function findAll() {
  const [rows] = await pool.execute(
    `${selectSites} ORDER BY s.id`
  );

  return rows.map(mapSite);
}

export async function findById(id) {
  const [rows] = await pool.execute(
    `${selectSites} WHERE s.id = ?`,
    [id]
  );

  return rows.length ? mapSite(rows[0]) : null;
}

export async function create(siteData) {
  const [result] = await pool.execute(
    `INSERT INTO sites
      (name, customer_id, location, service_type, status)
     VALUES (?, ?, ?, ?, ?)`,
    [
      siteData.name,
      siteData.customerId,
      siteData.location,
      siteData.serviceType,
      siteData.status,
    ]
  );

  return findById(result.insertId);
}

export async function replaceById(id, siteData) {
  const existing = await findById(id);
  if (!existing) return null;

  await pool.execute(
    `UPDATE sites
     SET name = ?,
         customer_id = ?,
         location = ?,
         service_type = ?,
         status = ?
     WHERE id = ?`,
    [
      siteData.name,
      siteData.customerId,
      siteData.location,
      siteData.serviceType,
      siteData.status,
      id,
    ]
  );

  return findById(id);
}

export async function patchById(id, updates) {
  const existing = await findById(id);
  if (!existing) return null;

  const columnMap = {
    name: "name",
    customerId: "customer_id",
    location: "location",
    serviceType: "service_type",
    status: "status",
  };

  const fields = Object.keys(updates);

  if (fields.length === 0) return existing;

  if (fields.some((field) => !Object.hasOwn(columnMap, field))) {
    throw new Error("Unsupported site update field");
  }

  const assignments = fields
    .map((field) => `${columnMap[field]} = ?`)
    .join(", ");

  const values = fields.map((field) => updates[field]);

  await pool.execute(
    `UPDATE sites SET ${assignments} WHERE id = ?`,
    [...values, id]
  );

  return findById(id);
}

export async function deleteById(id) {
  const existing = await findById(id);
  if (!existing) return null;

  await pool.execute(
    "DELETE FROM sites WHERE id = ?",
    [id]
  );

  return existing;
}
