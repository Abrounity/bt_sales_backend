import { Router } from "express";
import mongoose from "mongoose";
import { requireAdmin } from "../middleware/adminAuth.js";
import Product, { serializeProduct } from "../models/Product.js";

const router = Router();
const productFields = [
  "title",
  "category",
  "brand",
  "price",
  "originalPrice",
  "rating",
  "reviews",
  "isBestSeller",
  "badge",
  "image",
  "specs",
  "specIcons",
  "description",
];

function isRequestObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pickProductFields(body) {
  return Object.fromEntries(
    productFields
      .filter((field) => Object.hasOwn(body, field))
      .map((field) => [field, body[field]])
  );
}

function sendProductError(res, error) {
  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      success: false,
      message: "Product data is invalid.",
      errors: Object.values(error.errors).map((fieldError) => fieldError.message),
    });
  }

  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      message: `Invalid value for ${error.path}.`,
    });
  }

  console.error(`Product operation failed (${error.name || "Error"}).`);
  return res.status(500).json({
    success: false,
    message: "Product operation failed.",
  });
}

function productFilter(id) {
  return mongoose.isObjectIdOrHexString(id) ? { _id: id } : { sourceId: id };
}

function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: "MongoDB is unavailable. Product data was not changed.",
    });
  }
  next();
}

router.get("/", requireDatabase, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    return res.json({
      success: true,
      products: products.map(serializeProduct),
    });
  } catch (error) {
    return sendProductError(res, error);
  }
});

router.get("/:id", requireDatabase, async (req, res) => {
  try {
    const product = await Product.findOne(productFilter(req.params.id));
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    return res.json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    return sendProductError(res, error);
  }
});

router.post("/", requireAdmin, requireDatabase, async (req, res) => {
  if (!isRequestObject(req.body)) {
    return res.status(400).json({
      success: false,
      message: "Request body must be a product object.",
    });
  }

  try {
    const product = await Product.create(pickProductFields(req.body));
    return res.status(201).json({
      success: true,
      product: serializeProduct(product),
    });
  } catch (error) {
    return sendProductError(res, error);
  }
});

async function updateProduct(req, res) {
  if (!isRequestObject(req.body)) {
    return res.status(400).json({
      success: false,
      message: "Request body must contain product fields.",
    });
  }

  const updates = pickProductFields(req.body);
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one valid product field is required.",
    });
  }

  try {
    const product = await Product.findOneAndUpdate(productFilter(req.params.id), updates, {
      returnDocument: "after",
      runValidators: true,
    });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    return res.json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    return sendProductError(res, error);
  }
}

router.put("/:id", requireAdmin, requireDatabase, updateProduct);
router.patch("/:id", requireAdmin, requireDatabase, updateProduct);

router.delete("/:id", requireAdmin, requireDatabase, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete(productFilter(req.params.id));
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    return res.json({
      success: true,
      message: "Product deleted.",
      id: product._id.toString(),
    });
  } catch (error) {
    return sendProductError(res, error);
  }
});

export default router;
