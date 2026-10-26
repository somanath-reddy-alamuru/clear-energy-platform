
import { pool } from "../db/pool.js";

function mapCustomer(row) {
  if (!row) return null;

  return {
    id: Number(row.id),
    companyName: row.company_name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    billingAddress: row.billing_address,
    status: row.status,
  };
}

const columns = `
  id, company_name, contact_name, email,
  phone, billing_address, status
`;

export async function findAll() {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM customers ORDER BY id`
  );

  return rows.map(mapCustomer);
}

export async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM customers WHERE id = ?`,
    [id]
  );

  return rows.length ? mapCustomer(rows[0]) : null;
}

export async function findByCompanyName(companyName) {
  const [rows] = await pool.execute(
    `SELECT ${columns}
     FROM customers
     WHERE company_name = ?
     LIMIT 1`,
    [companyName]
  );

  return rows.length ? mapCustomer(rows[0]) : null;
}

export async function create(customer) {
  const [result] = await pool.execute(
    `INSERT INTO customers
      (company_name, contact_name, email, phone,
       billing_address, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      customer.companyName,
      customer.contactName,
      customer.email,
      customer.phone,
      customer.billingAddress,
      customer.status,
    ]
  );

  return findById(result.insertId);
}

export async function replaceById(id, customer) {
  const existing = await findById(id);
  if (!existing) return null;

  await pool.execute(
    `UPDATE customers
     SET company_name = ?,
         contact_name = ?,
         email = ?,
         phone = ?,
         billing_address = ?,
         status = ?
     WHERE id = ?`,
    [
      customer.companyName,
      customer.contactName,
      customer.email,
      customer.phone,
      customer.billingAddress,
      customer.status,
      id,
    ]
  );

  return findById(id);
}

export async function patchById(id, updates) {
  const existing = await findById(id);
  if (!existing) return null;

  const columnMap = {
    companyName: "company_name",
    contactName: "contact_name",
    email: "email",
    phone: "phone",
    billingAddress: "billing_address",
    status: "status",
  };

  const fields = Object.keys(updates);

  if (fields.length === 0) return existing;

  if (fields.some((field) => !Object.hasOwn(columnMap, field))) {
    throw new Error("Unsupported customer update field");
  }

  const assignments = fields
    .map((field) => `${columnMap[field]} = ?`)
    .join(", ");

  const values = fields.map((field) => updates[field]);

  await pool.execute(
    `UPDATE customers SET ${assignments} WHERE id = ?`,
    [...values, id]
  );

  return findById(id);
}

export async function deleteById(id) {
  const existing = await findById(id);
  if (!existing) return null;

  await pool.execute(
    "DELETE FROM customers WHERE id = ?",
    [id]
  );

  return existing;
}
