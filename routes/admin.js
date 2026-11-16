import { Router } from "express";
import {
  adminAuthConfigured,
  clearAdminSession,
  isAdminAuthenticated,
  requireAdmin,
  setAdminSession,
  verifyAdminCredentials,
} from "../middleware/adminAuth.js";

const router = Router();

router.post("/login", (req, res) => {
  if (!adminAuthConfigured()) {
    return res.status(503).json({
      success: false,
      message: "Admin authentication is not configured.",
    });
  }
  if (!verifyAdminCredentials(req.body?.email, req.body?.password)) {
    return res.status(401).json({ success: false, message: "Invalid admin email or password." });
  }

  setAdminSession(res);
  return res.json({ success: true });
});

router.get("/session", requireAdmin, (req, res) => {
  return res.json({ success: true, authenticated: isAdminAuthenticated(req) });
});

router.post("/logout", (req, res) => {
  clearAdminSession(res);
  return res.json({ success: true });
});

export default router;
