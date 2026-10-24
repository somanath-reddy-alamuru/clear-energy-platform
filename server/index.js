import express from "express";
import cors from "cors";

import sitesRouter from "./routes/sites.js";
import { AppError } from "./utils/AppError.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { pool } from "./db/pool.js";

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    status: "ok",
    message: "Backend connected successfully",
  });
});

app.use("/api/sites", sitesRouter);

app.use((req, res, next) => {
  next(
    new AppError(
      404,
      `Route not found: ${req.method} ${req.originalUrl}`
    )
  );
});

// Error-handling middleware must be registered last.
app.use(errorHandler);

async function startServer() {
  try {
    await pool.query("SELECT 1");

    console.log("MySQL connected successfully.");

    app.listen(PORT, () => {
      console.log(
        `Backend running at http://localhost:${PORT}`
      );
    });
  } catch (err) {
    console.error("Unable to connect to MySQL.");
    console.error(err.message);
    console.error(
      "Check your MySQL service, credentials, database, and server/.env."
    );

    process.exit(1);
  }
}

startServer();