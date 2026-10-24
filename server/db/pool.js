import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { fileURLToPath } from "node:url";

// Load the .env file from the server directory.
dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME || "clear_energy",

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export { pool };