import { Router } from "express";
import mongoose from "mongoose";
import { requireAdmin } from "../middleware/adminAuth.js";
import ContactMessage from "../models/ContactMessage.js";

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRequestObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function serializeMessage(message) {
  const { _id, __v, ...data } = message;
  return { ...data, id: _id.toString() };
}

function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: "MongoDB is unavailable. Your message was not saved.",
    });
  }
  next();
}

function sendMessageError(res, error) {
  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      success: false,
      message: "Contact details are invalid.",
      errors: Object.values(error.errors).map((fieldError) => fieldError.message),
    });
  }

  console.error(`Contact message operation failed (${error.name || "Error"}).`);
  return res.status(500).json({
    success: false,
    message: "Contact message operation failed.",
  });
}

router.post("/", requireDatabase, async (req, res) => {
  if (!isRequestObject(req.body)) {
    return res.status(400).json({
      success: false,
      message: "Request body must contain your contact details.",
    });
  }

  const { name, phone, email, subject, message } = req.body;
  if (
    typeof name !== "string" ||
    typeof phone !== "string" ||
    typeof subject !== "string" ||
    typeof message !== "string" ||
    (email !== undefined && typeof email !== "string")
  ) {
    return res.status(400).json({
      success: false,
      message: "Name, phone, subject, and message are required.",
    });
  }

  const contact = {
    name: name.trim(),
    phone: phone.trim(),
    email: typeof email === "string" ? email.trim() : "",
    subject: subject.trim(),
    message: message.trim(),
  };
  if (
    !contact.name ||
    !contact.phone ||
    !contact.subject ||
    !contact.message ||
    (contact.email && !emailPattern.test(contact.email))
  ) {
    return res.status(400).json({
      success: false,
      message: "Enter a name, phone, subject, and message, and use a valid email address.",
    });
  }

  try {
    const savedMessage = await ContactMessage.create(contact);
    return res.status(201).json({
      success: true,
      message: serializeMessage(savedMessage.toObject()),
    });
  } catch (error) {
    return sendMessageError(res, error);
  }
});

router.get("/", requireAdmin, requireDatabase, async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 }).lean();
    return res.json({
      success: true,
      messages: messages.map(serializeMessage),
    });
  } catch (error) {
    return sendMessageError(res, error);
  }
});

router.patch("/:id", requireAdmin, requireDatabase, async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid contact message id." });
  }
  if (!isRequestObject(req.body) || !["new", "read"].includes(req.body.status)) {
    return res.status(400).json({
      success: false,
      message: 'Status must be either "new" or "read".',
    });
  }

  try {
    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { returnDocument: "after", runValidators: true }
    ).lean();
    if (!message) {
      return res.status(404).json({ success: false, message: "Contact message not found." });
    }
    return res.json({ success: true, message: serializeMessage(message) });
  } catch (error) {
    return sendMessageError(res, error);
  }
});

router.delete("/:id", requireAdmin, requireDatabase, async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid contact message id." });
  }

  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: "Contact message not found." });
    }
    return res.json({ success: true, id: message._id.toString() });
  } catch (error) {
    return sendMessageError(res, error);
  }
});

export default router;
