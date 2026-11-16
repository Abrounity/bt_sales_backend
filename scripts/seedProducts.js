import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { products } from "../../frontend/data/products.ts";
import connectDB from "../config/db.js";
import Product from "../models/Product.js";

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(backendDirectory, ".env") });

try {
  await connectDB();

  for (const { id, ...product } of products) {
    await Product.updateOne(
      { sourceId: id },
      {
        $set: product,
        $setOnInsert: { sourceId: id },
      },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Seeded ${products.length} catalog products into MongoDB.`);
} catch (error) {
  if (error.code === "INVALID_MONGODB_URI") {
    console.error("Seeding requires a valid MONGODB_URI starting with mongodb:// or mongodb+srv://.");
  } else if (error.code === "MISSING_MONGODB_URI") {
    console.error("Seeding requires MONGODB_URI to be set in backend/.env.");
  } else {
    console.error(`Product seeding failed (${error.name}).`);
  }
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
