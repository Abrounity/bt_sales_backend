import { Router } from "express";
import mongoose from "mongoose";
import { requireAdmin } from "../middleware/adminAuth.js";
import HomepageContent from "../models/HomepageContent.js";

const router = Router();
const singletonKey = "home";

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasStringFields(value, fields) {
  return isRecord(value) && fields.every((field) => typeof value[field] === "string");
}

function hasStringArray(value, fields, maxLength) {
  return (
    Array.isArray(value) &&
    value.length <= maxLength &&
    value.every((item) => hasStringFields(item, fields))
  );
}

function isSafeHref(value) {
  return /^\/(?!\/)|^#|^https:\/\//i.test(value);
}

function isValidHomepageContent(content) {
  if (!isRecord(content)) return false;
  const valid =
    isRecord(content.hero) &&
    hasStringArray(content.hero.slides, ["image", "alt"], 10) &&
    isRecord(content.categories) &&
    hasStringFields(content.categories, ["title", "subtitle"]) &&
    hasStringArray(
      content.categories.cards,
      ["title", "description", "href", "cta", "icon"],
      20
    ) &&
    isRecord(content.spotlight) &&
    hasStringFields(content.spotlight, ["title", "subtitle"]) &&
    hasStringArray(
      content.spotlight.cards,
      ["productId", "title", "description", "image", "buttonText"],
      20
    ) &&
    content.spotlight.cards.every(
      (card) =>
        card.price === undefined ||
        (typeof card.price === "number" && Number.isFinite(card.price) && card.price >= 0)
    ) &&
    isRecord(content.bestSellers) &&
    hasStringFields(content.bestSellers, ["title", "subtitle"]) &&
    isRecord(content.promo) &&
    hasStringFields(content.promo, ["eyebrow", "title", "description"]) &&
    hasStringArray(content.promo.buttons, ["label", "href"], 10) &&
    hasStringArray(content.promo.features, ["icon", "title", "description"], 20) &&
    isRecord(content.testimonials) &&
    hasStringFields(content.testimonials, ["title", "subtitle"]) &&
    Array.isArray(content.testimonials.items) &&
    content.testimonials.items.length <= 30 &&
    content.testimonials.items.every(
      (item) =>
        hasStringFields(item, ["quote", "name", "location", "image"]) &&
        Number.isInteger(item.rating) &&
        item.rating >= 1 &&
        item.rating <= 5
    ) &&
    hasStringArray(content.footerFeatures, ["icon", "title", "description"], 20);
  if (!valid) return false;
  if (
    !content.categories.cards.every((card) => isSafeHref(card.href)) ||
    !content.promo.buttons.every((button) => isSafeHref(button.href)) ||
    !content.categories.cards.every((card) => card.iconImage === undefined || typeof card.iconImage === "string") ||
    !content.promo.features.every((feature) => feature.iconImage === undefined || typeof feature.iconImage === "string") ||
    !content.footerFeatures.every((feature) => feature.iconImage === undefined || typeof feature.iconImage === "string")
  ) {
    return false;
  }

  return JSON.stringify(content).length <= 500_000;
}

function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: "MongoDB is unavailable. Homepage content was not changed.",
    });
  }
  next();
}

router.get("/", requireDatabase, async (req, res) => {
  try {
    const saved = await HomepageContent.findOne({ key: singletonKey }).lean();
    return res.json({ success: true, content: saved?.content ?? null });
  } catch (error) {
    console.error(`Homepage content read failed (${error.name || "Error"}).`);
    return res.status(500).json({
      success: false,
      message: "Homepage content could not be loaded.",
    });
  }
});

router.put("/", requireAdmin, requireDatabase, async (req, res) => {
  if (!isValidHomepageContent(req.body?.content)) {
    return res.status(400).json({
      success: false,
      message: "Homepage content is invalid or exceeds supported limits.",
    });
  }

  try {
    const saved = await HomepageContent.findOneAndUpdate(
      { key: singletonKey },
      { $set: { content: req.body.content }, $setOnInsert: { key: singletonKey } },
      { upsert: true, new: true, runValidators: true }
    );
    return res.json({ success: true, content: saved.content });
  } catch (error) {
    console.error(`Homepage content save failed (${error.name || "Error"}).`);
    return res.status(500).json({
      success: false,
      message: "Homepage content could not be saved.",
    });
  }
});

export default router;
