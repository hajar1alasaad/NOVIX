import { rateLimit } from "express-rate-limit";

/** General API rate limit: 200 req / 15 min per IP */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again in 15 minutes." },
  skipSuccessfulRequests: false,
});

/** Auth endpoints: 10 req / 15 min per IP (brute-force protection) */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." },
  skipSuccessfulRequests: true,
});

/** AI endpoints: 50 req / 15 min per IP (cost protection) */
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "AI request limit reached. Please wait before making more requests." },
  skipSuccessfulRequests: false,
});
