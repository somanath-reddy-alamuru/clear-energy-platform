import express from "express";
import cors from "cors";

import sitesRouter from "./routes/sites.js";
import { AppError } from "./utils/AppError.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    status: "ok",
    message: "Backend connected successfully"
  });
});

app.use("/api/sites", sitesRouter);

// Return a consistent JSON response for unknown routes.
app.use((req, res, next) => {
  next(
    new AppError(
      404,
      `Route not found: ${req.method} ${req.originalUrl}`
    )
  );
});

// Error handler must be registered after the routes.
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});