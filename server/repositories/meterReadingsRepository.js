
import { pool } from "../db/pool.js";

function mapReading(row) {
  if (!row) return null;

  return {
    id: Number(row.id),
    meterId: Number(row.meter_id),
    readingValue: Number(row.reading_value),
    readingAt: row.reading_at,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

const selectReadings = `
  SELECT
    id,
    meter_id,
    reading_value,
    DATE_FORMAT(reading_at, '%Y-%m-%d %H:%i:%s') AS reading_at,
    notes,
    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
  FROM meter_readings
`;

export async function findAllByMeterId(meterId) {
  const [rows] = await pool.execute(
    `${selectReadings}
     WHERE meter_id = ?
     ORDER BY reading_at ASC`,
    [meterId]
  );

  return rows.map(mapReading);
}

export async function findByTimestamp(meterId, readingAt) {
  const [rows] = await pool.execute(
    `${selectReadings}
     WHERE meter_id = ? AND reading_at = ?`,
    [meterId, readingAt]
  );

  return rows.length ? mapReading(rows[0]) : null;
}

export async function findLatestAtOrBefore(meterId, readingAt) {
  const [rows] = await pool.execute(
    `${selectReadings}
     WHERE meter_id = ? AND reading_at <= ?
     ORDER BY reading_at DESC
     LIMIT 1`,
    [meterId, readingAt]
  );

  return rows.length ? mapReading(rows[0]) : null;
}

export async function findEarliestAfter(meterId, readingAt) {
  const [rows] = await pool.execute(
    `${selectReadings}
     WHERE meter_id = ? AND reading_at > ?
     ORDER BY reading_at ASC
     LIMIT 1`,
    [meterId, readingAt]
  );

  return rows.length ? mapReading(rows[0]) : null;
}

export async function create(meterId, data) {
  const [result] = await pool.execute(
    `INSERT INTO meter_readings
      (meter_id, reading_value, reading_at, notes)
     VALUES (?, ?, ?, ?)`,
    [
      meterId,
      data.readingValue,
      data.readingAt,
      data.notes,
    ]
  );

  const [rows] = await pool.execute(
    `${selectReadings} WHERE id = ?`,
    [result.insertId]
  );

  return rows.length ? mapReading(rows[0]) : null;
}
