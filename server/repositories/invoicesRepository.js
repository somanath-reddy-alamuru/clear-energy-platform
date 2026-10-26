
import { pool } from "../db/pool.js";

const selectInvoices = `
  SELECT
    i.id,
    i.invoice_number,
    i.contract_id,
    c.contract_code,
    i.customer_id,
    cu.company_name AS customer_name,
    i.site_id,
    s.name AS site_name,
    i.meter_id,
    m.meter_code,
    DATE_FORMAT(i.period_start, '%Y-%m-%d %H:%i:%s') AS period_start,
    DATE_FORMAT(i.period_end, '%Y-%m-%d %H:%i:%s') AS period_end,
    i.opening_reading,
    i.closing_reading,
    i.consumption,
    i.unit,
    i.rate_per_unit,
    i.subtotal,
    i.tax_rate,
    i.tax_amount,
    i.total_amount,
    i.status,
    DATE_FORMAT(i.issue_date, '%Y-%m-%d') AS issue_date,
    DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,
    DATE_FORMAT(i.paid_at, '%Y-%m-%d %H:%i:%s') AS paid_at,
    c.currency
  FROM invoices i
  JOIN contracts c ON c.id = i.contract_id
  JOIN customers cu ON cu.id = i.customer_id
  JOIN sites s ON s.id = i.site_id
  JOIN meters m ON m.id = i.meter_id
`;

function mapInvoice(row) {
  if (!row) return null;

  return {
    id: Number(row.id),
    invoiceNumber: row.invoice_number,
    contractId: Number(row.contract_id),
    contractCode: row.contract_code,
    customerId: Number(row.customer_id),
    customerName: row.customer_name,
    siteId: Number(row.site_id),
    siteName: row.site_name,
    meterId: Number(row.meter_id),
    meterCode: row.meter_code,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    openingReading: Number(row.opening_reading),
    closingReading: Number(row.closing_reading),
    consumption: Number(row.consumption),
    unit: row.unit,
    ratePerUnit: Number(row.rate_per_unit),
    subtotal: Number(row.subtotal),
    taxRate: Number(row.tax_rate),
    taxAmount: Number(row.tax_amount),
    totalAmount: Number(row.total_amount),
    currency: row.currency,
    status: row.status,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    paidAt: row.paid_at,
  };
}

export async function findAll() {
  const [rows] = await pool.execute(
    `${selectInvoices} ORDER BY i.id DESC`
  );

  return rows.map(mapInvoice);
}

export async function findById(id) {
  const [rows] = await pool.execute(
    `${selectInvoices} WHERE i.id = ?`,
    [id]
  );

  return rows.length ? mapInvoice(rows[0]) : null;
}

export async function create(data) {
  const connection = await pool.getConnection();

  let invoiceId;

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO invoices (
        invoice_number, contract_id, customer_id, site_id, meter_id,
        period_start, period_end,
        opening_reading, closing_reading, consumption, unit,
        rate_per_unit, subtotal, tax_rate, tax_amount, total_amount,
        status, issue_date, due_date
      ) VALUES (
        NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        'Draft', CURRENT_DATE, ?
      )`,
      [
        data.contractId,
        data.customerId,
        data.siteId,
        data.meterId,
        data.periodStart,
        data.periodEnd,
        data.openingReading,
        data.closingReading,
        data.consumption,
        data.unit,
        data.ratePerUnit,
        data.subtotal,
        data.taxRate,
        data.taxAmount,
        data.totalAmount,
        data.dueDate,
      ]
    );

    invoiceId = result.insertId;

    const invoiceNumber =
      `INV-${new Date().getFullYear()}-${String(invoiceId).padStart(6, "0")}`;

    await connection.execute(
      "UPDATE invoices SET invoice_number = ? WHERE id = ?",
      [invoiceNumber, invoiceId]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return findById(invoiceId);
}

export async function updateStatus(id, status) {
  await pool.execute(
    `UPDATE invoices
     SET status = ?,
         issue_date = CASE
           WHEN ? = 'Issued' AND status = 'Draft'
           THEN CURRENT_DATE
           ELSE issue_date
         END,
         paid_at = CASE
           WHEN ? = 'Paid' THEN CURRENT_TIMESTAMP
           ELSE paid_at
         END
     WHERE id = ?`,
    [status, status, status, id]
  );

  return findById(id);
}
