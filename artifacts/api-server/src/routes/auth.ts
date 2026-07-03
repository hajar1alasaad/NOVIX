import { Router } from "express";
import {
  findUserByEmail,
  findUserById,
  createUser,
  validatePassword,
  createToken,
  updateUser,
  publicUser,
  getUserCount,
} from "../lib/auth-store.js";
import { requireAuth } from "../middlewares/auth.js";
import { authLimiter } from "../middlewares/rate-limit.js";
import { addLog } from "../lib/store.js";

const router = Router();

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePasswordStrength(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters";
  return null;
}

// POST /api/auth/register
router.post("/auth/register", authLimiter, async (req, res) => {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string };

  if (!email || !password || !name) {
    res.status(400).json({ error: "Email, password, and name are required" });
    return;
  }
  if (!validateEmail(email)) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }
  const pwError = validatePasswordStrength(password);
  if (pwError) {
    res.status(400).json({ error: pwError });
    return;
  }
  if (name.trim().length < 2) {
    res.status(400).json({ error: "Name must be at least 2 characters" });
    return;
  }

  try {
    const user = await createUser(email, password, name);
    const token = createToken(user);
    addLog({ agent: "auth", action: "User registered", detail: `New user: ${email}`, status: "success" });
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    res.status(409).json({ error: msg });
  }
});

// POST /api/auth/login
router.post("/auth/login", authLimiter, async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const user = findUserByEmail(email);
  if (!user) {
    // Return same message to prevent user enumeration
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await validatePassword(user, password);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  updateUser(user.id, { lastLoginAt: new Date().toISOString() });
  const token = createToken(user);
  addLog({ agent: "auth", action: "User login", detail: `${email} signed in`, status: "success" });
  res.json({ token, user: publicUser(user) });
});

// POST /api/auth/logout
router.post("/auth/logout", requireAuth, (req, res) => {
  // JWT is stateless — client deletes the token
  addLog({ agent: "auth", action: "User logout", detail: `${req.user?.email} signed out`, status: "info" });
  res.json({ success: true, message: "Logged out successfully" });
});

// GET /api/auth/me — get current user from token
router.get("/auth/me", requireAuth, (req, res) => {
  const user = findUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user: publicUser(user) });
});

// PUT /api/auth/profile — update profile
router.put("/auth/profile", requireAuth, (req, res) => {
  const { name, profile, settings } = req.body as {
    name?: string;
    profile?: Record<string, unknown>;
    settings?: Record<string, unknown>;
  };

  const user = findUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (name) updates["name"] = name;
  if (profile) updates["profile"] = { ...user.profile, ...profile };
  if (settings) updates["settings"] = { ...user.settings, ...settings };

  const updated = updateUser(user.id, updates as Parameters<typeof updateUser>[1]);
  res.json({ user: updated ? publicUser(updated) : publicUser(user) });
});

// POST /api/auth/forgot-password — stub (ready for email integration)
router.post("/auth/forgot-password", authLimiter, (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email || !validateEmail(email)) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }
  // In production: generate reset token, send email
  // For MVP: always return success to prevent user enumeration
  addLog({ agent: "auth", action: "Password reset requested", detail: email, status: "info" });
  res.json({ success: true, message: "If that email exists, a reset link will be sent." });
});

// GET /api/auth/stats — admin: user count
router.get("/auth/stats", requireAuth, (req, res) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  res.json({ totalUsers: getUserCount() });
});

export default router;
