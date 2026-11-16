
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

// Get current directory
const currentFile = fileURLToPath(import.meta.url);
const backendDirectory = path.dirname(currentFile);

// Load environment variables first
dotenv.config({
  path: path.join(backendDirectory, ".env"),
});

// Import CORS middleware after dotenv
const { default: corsMiddleware } = await import(
  "./middleware/corsOptions.js"
);

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Middleware
app.use(corsMiddleware);

// Body Parser
app.use(express.json({ limit: "1mb" }));

// Health Check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend server running successfully!",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// API Routes
app.use("/api/products", productsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/contact", contactMessagesRouter);
app.use("/api/admin", adminRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found.",
  });
});

// MongoDB Connection
function connectWithRetry() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing. Configure it in environment variables.");
    return;
  }

  connectDB().catch((error) => {
    if (
      error.code === "INVALID_MONGODB_URI" ||
      error.name === "MongoParseError"
    ) {
      console.error("Invalid MONGODB_URI.");
      return;
    }

    console.error(
      `MongoDB connection failed (${error.name}); retrying in 10 seconds.`
    );

    setTimeout(connectWithRetry, 10000).unref();
  });
}

// Start Server
function startServer() {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  connectWithRetry();
}

// Initialize Server
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === currentFile
) {
  startServer();
}

export default app;
