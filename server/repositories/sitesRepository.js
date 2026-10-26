
import { pool } from "../db/pool.js";

// Convert MySQL column names into our existing API field names.
function mapSite(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    name: row.name,
    customerName: row.customer_name,
    location: row.location,
    serviceType: row.service_type,
    status: row.status,
  };
}

// GET: Retrieve all sites.
export async function findAll() {
  const [rows] = await pool.execute(`
    SELECT
      id,
      name,
      customer_name,
      location,
      service_type,
      status
    FROM sites
    ORDER BY id
  `);

  return rows.map(mapSite);
}

// GET: Retrieve one site.
export async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       name,
       customer_name,
       location,
       service_type,
       status
     FROM sites
     WHERE id = ?`,
    [id]
  );

  return rows.length ? mapSite(rows[0]) : null;
}

// POST: Create a site.
export async function create(siteData) {
  const [result] = await pool.execute(
    `INSERT INTO sites
       (name, customer_name, location, service_type, status)
     VALUES (?, ?, ?, ?, ?)`,
    [
      siteData.name,
      siteData.customerName,
      siteData.location,
      siteData.serviceType,
      siteData.status,
    ]
  );

  return findById(result.insertId);
}

// PUT: Replace all editable fields.
export async function replaceById(id, siteData) {
  const existing = await findById(id);

  if (!existing) {
    return null;
  }

  await pool.execute(
    `UPDATE sites
     SET name = ?,
         customer_name = ?,
         location = ?,
         service_type = ?,
         status = ?
     WHERE id = ?`,
    [
      siteData.name,
      siteData.customerName,
      siteData.location,
      siteData.serviceType,
      siteData.status,
      id,
    ]
  );

  return findById(id);
}

// PATCH: Update selected fields only.
export async function patchById(id, updates) {
  const existing = await findById(id);

  if (!existing) {
    return null;
  }

  const columns = {
    name: "name",
    customerName: "customer_name",
    location: "location",
    serviceType: "service_type",
    status: "status",
  };

  const fields = Object.keys(updates);

  if (fields.length === 0) {
    return existing;
  }

  if (
    fields.some((field) => !Object.hasOwn(columns, field))
  ) {
    throw new Error("Unsupported update field");
  }

  const assignments = fields
    .map((field) => `${columns[field]} = ?`)
    .join(", ");

  const values = fields.map((field) => updates[field]);

  await pool.execute(
    `UPDATE sites SET ${assignments} WHERE id = ?`,
    [...values, id]
  );

  return findById(id);
}

// DELETE: Remove a site.
export async function deleteById(id) {
  const existing = await findById(id);

  if (!existing) {
    return null;
  }

  await pool.execute(
    "DELETE FROM sites WHERE id = ?",
    [id]
  );

  return existing;
}
