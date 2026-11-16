import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import connectDB from "./config/db.js";
import adminRouter from "./routes/admin.js";
import contactMessagesRouter from "./routes/contactMessages.js";
import productsRouter from "./routes/products.js";
import uploadsRouter from "./routes/uploads.js";

const currentFile = fileURLToPath(import.meta.url);
const backendDirectory = path.dirname(currentFile);

dotenv.config({ path: path.join(backendDirectory, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend server running successfully!",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use("/api/products", productsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/contact", contactMessagesRouter);
app.use("/api/admin", adminRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

function connectWithRetry() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing. Configure it in backend/.env.");
    return;
  }

  connectDB().catch((error) => {
    if (error.code === "INVALID_MONGODB_URI" || error.name === "MongoParseError") {
      console.error("Invalid MONGODB_URI. Use a full URI starting with mongodb:// or mongodb+srv://.");
      return;
    }

    console.error(`MongoDB connection failed (${error.name}); retrying in 10 seconds.`);
    setTimeout(connectWithRetry, 10000).unref();
  });
}

function startServer() {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  connectWithRetry();
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  startServer();
}

export default app;
