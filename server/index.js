
import express from "express";
import cors from "cors";

const app = express();
const PORT = 5000;

// Allow our React frontend to call this backend.
app.use(cors({ origin: "http://localhost:5173" }));

// Allow the server to process JSON request bodies.
app.use(express.json());

// First API endpoint.
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Backend connecte successfully"
  });
});

// Start the server.
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
