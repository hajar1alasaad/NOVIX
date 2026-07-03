import type { Request, Response, NextFunction } from "express";
import { verifyToken, findUserById, type JwtPayload } from "../lib/auth-store.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { name?: string };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized — missing token" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: "Unauthorized — invalid or expired token" });
    return;
  }

  // Attach user to request
  const user = findUserById(payload.userId);
  req.user = { ...payload, name: user?.name };
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) req.user = payload;
  }
  next();
}

export function requireRole(role: "admin" | "user") {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (role === "admin" && req.user.role !== "admin") {
      res.status(403).json({ error: "Forbidden — admin role required" });
      return;
    }
    next();
  };
}
