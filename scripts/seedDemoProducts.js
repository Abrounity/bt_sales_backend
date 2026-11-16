import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import connectDB from "../config/db.js";
import Product from "../models/Product.js";

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(backendDirectory, ".env") });

const demoProducts = [
  {
    sourceId: "demo-smartphone-001",
    title: "Demo Smartphone X1",
    category: "phones",
    brand: "DemoTech",
    price: 24999,
    originalPrice: 29999,
    rating: 4.3,
    reviews: 18,
    badge: "Demo Product",
    image: "/images/products/iphone18.webp",
    specs: {
      Display: "6.5-inch AMOLED",
      Processor: "DemoTech Octa-Core",
      Camera: "50MP dual camera",
      Battery: "5000 mAh",
    },
    description: "Sample smartphone listing for testing the BT Sales product catalog.",
  },
  {
    sourceId: "demo-smart-tv-001",
    title: "Demo Smart TV 43-inch",
    category: "appliances",
    brand: "DemoTech",
    price: 31999,
    originalPrice: 37999,
    rating: 4.1,
    reviews: 11,
    badge: "Demo Product",
    image: "/images/products/tv.webp",
    specs: {
      Display: "43-inch 4K UHD",
      OS: "DemoOS Smart TV",
      Connectivity: "Wi-Fi and Bluetooth",
      Warranty: "1 year",
    },
    description: "Sample smart television listing for testing product search and details.",
  },
  {
    sourceId: "demo-headphones-001",
    title: "Demo Wireless Headphones",
    category: "accessories",
    brand: "DemoTech",
    price: 3999,
    originalPrice: 4999,
    rating: 4.2,
    reviews: 24,
    badge: "Demo Product",
    image: "/images/products/airPods.webp",
    specs: {
      Connection: "Bluetooth 5.3",
      Battery: "Up to 30 hours",
      Microphone: "Built-in microphone",
      Charging: "USB-C",
    },
    description: "Sample wireless headphones listing for testing accessory products.",
  },
];

try {
  await connectDB();
  await Product.init();

  for (const product of demoProducts) {
    await Product.updateOne(
      { sourceId: product.sourceId },
      {
        $set: product,
        $setOnInsert: { sourceId: product.sourceId },
      },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Seeded ${demoProducts.length} demo products into MongoDB.`);
} catch (error) {
  console.error(`Demo product seeding failed (${error.name}).`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
