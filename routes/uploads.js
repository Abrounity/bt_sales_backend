import express, { Router } from "express";
import { v2 as cloudinary } from "cloudinary";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();
const supportedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const imageBody = express.raw({
  type: [...supportedImageTypes],
  limit: "2mb",
});

function hasValidImageSignature(buffer, contentType) {
  if (contentType === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (contentType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  return (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  );
}

async function uploadImage(req, res, folder, kind) {
  const contentType = (req.get("content-type") || "").split(";")[0].toLowerCase();
  if (!supportedImageTypes.has(contentType)) {
    return res.status(415).json({
      success: false,
      message: "Upload a PNG, JPEG, or WebP image.",
    });
  }

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Choose an image file to upload.",
    });
  }

  if (!hasValidImageSignature(req.body, contentType)) {
    return res.status(400).json({
      success: false,
      message: "The uploaded file is not a valid PNG, JPEG, or WebP image.",
    });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(503).json({
      success: false,
      message: "Cloudinary is not configured on the backend.",
    });
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  try {
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          allowed_formats: ["png", "jpg", "jpeg", "webp"],
        },
        (error, uploadedImage) => {
          if (error) {
            reject(error);
          } else if (!uploadedImage?.secure_url) {
            reject(new Error("Cloudinary did not return a secure image URL."));
          } else {
            resolve(uploadedImage);
          }
        }
      );
      uploadStream.end(req.body);
    });

    return res.status(201).json({ success: true, url: result.secure_url });
  } catch (error) {
    console.error(`Cloudinary ${kind} upload failed (${error.name || "Error"}).`);
    return res.status(502).json({
      success: false,
      message: "Cloudinary could not store the image.",
    });
  }
}

router.post(
  "/specification-icon",
  requireAdmin,
  imageBody,
  (req, res) => uploadImage(req, res, "bt-sales/specification-icons", "specification icon")
);
router.post(
  "/product-image",
  requireAdmin,
  imageBody,
  (req, res) => uploadImage(req, res, "bt-sales/products", "product image")
);

router.use((error, req, res, next) => {
  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Image files must be 2 MB or smaller.",
    });
  }
  return next(error);
});

export default router;
