import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const cookieName = "bt_sales_admin";
const sessionDurationSeconds = 8 * 60 * 60;

function configured() {
  return Boolean(
    process.env.ADMIN_EMAIL?.trim() &&
    process.env.ADMIN_PASSWORD &&
      process.env.ADMIN_SESSION_SECRET &&
      process.env.ADMIN_SESSION_SECRET.length >= 32
  );
}

function constantTimeEqual(left, right) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function signature(expiresAt) {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET)
    .update(expiresAt)
    .digest("base64url");
}

function readSessionCookie(req) {
  const prefix = `${cookieName}=`;
  const entry = (req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : "";
}

export function adminAuthConfigured() {
  return configured();
}

export function verifyAdminCredentials(email, password) {
  if (!configured() || typeof email !== "string" || typeof password !== "string") {
    return false;
  }
  const emailMatches = constantTimeEqual(
    email.trim().toLowerCase(),
    process.env.ADMIN_EMAIL.trim().toLowerCase()
  );
  const passwordMatches = constantTimeEqual(password, process.env.ADMIN_PASSWORD);
  return emailMatches && passwordMatches;
}

export function setAdminSession(res) {
  const expiresAt = String(Math.floor(Date.now() / 1000) + sessionDurationSeconds);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const sameSite = process.env.NODE_ENV === "production" ? "None" : "Strict";
  res.setHeader(
    "Set-Cookie",
    `${cookieName}=${expiresAt}.${signature(expiresAt)}; Path=/api; HttpOnly; SameSite=${sameSite}; Max-Age=${sessionDurationSeconds}${secure}`
  );
}

export function clearAdminSession(res) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const sameSite = process.env.NODE_ENV === "production" ? "None" : "Strict";
  res.setHeader(
    "Set-Cookie",
    `${cookieName}=; Path=/api; HttpOnly; SameSite=${sameSite}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`
  );
}

export function isAdminAuthenticated(req) {
  if (!configured()) return false;
  const [expiresAt, providedSignature, extra] = readSessionCookie(req).split(".");
  if (extra !== undefined || !/^\d+$/.test(expiresAt || "")) return false;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;

  const expectedSignature = signature(expiresAt);
  return (
    providedSignature?.length === expectedSignature.length &&
    timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))
  );
}

export function requireAdmin(req, res, next) {
  if (!configured()) {
    return res.status(503).json({
      success: false,
      message: "Admin authentication is not configured.",
    });
  }
  if (req.get("x-admin-request") !== "1" || !isAdminAuthenticated(req)) {
    return res.status(401).json({ success: false, message: "Admin login required." });
  }
  next();
}
