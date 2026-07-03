import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const DATA_DIR = path.resolve(process.cwd(), "agents-data");
const AUTH_FILE = path.join(DATA_DIR, "auth-store.json");
const JWT_SECRET = process.env["SESSION_SECRET"] ?? "novix-dev-secret-change-in-production";
const JWT_EXPIRES = "7d";
const SALT_ROUNDS = 10;

export type UserRole = "admin" | "user";
export type SubscriptionPlan = "starter" | "professional" | "business" | "enterprise";
export type SubscriptionStatus = "active" | "trial" | "expired" | "cancelled";

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt?: string;
  profile: {
    profession: string;
    company: string;
    avatar?: string;
    bio: string;
    skills: string[];
    audienceSize: number;
    socialMedia: Record<string, string>;
  };
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    startedAt: string;
    endsAt?: string;
    stripeCustomerId?: string;
  };
  settings: {
    notifications: boolean;
    emailAlerts: boolean;
    autoReply: boolean;
    autoTasks: boolean;
    smartPriority: boolean;
    weeklyReport: boolean;
    darkMode: boolean;
    language: "en" | "ar";
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

interface AuthStore {
  users: AuthUser[];
}

let _store: AuthStore = { users: [] };

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function initAuthStore(): void {
  try {
    ensureDir();
    if (fs.existsSync(AUTH_FILE)) {
      const raw = fs.readFileSync(AUTH_FILE, "utf-8");
      _store = JSON.parse(raw) as AuthStore;
    } else {
      persistAuthStore();
    }
  } catch {
    _store = { users: [] };
  }
}

function persistAuthStore(): void {
  try {
    ensureDir();
    const tmp = AUTH_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(_store, null, 2), "utf-8");
    fs.renameSync(tmp, AUTH_FILE);
  } catch { /* ignore */ }
}

export function findUserByEmail(email: string): AuthUser | undefined {
  return _store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string): AuthUser | undefined {
  return _store.users.find((u) => u.id === id);
}

export async function createUser(
  email: string,
  password: string,
  name: string
): Promise<AuthUser> {
  if (findUserByEmail(email)) throw new Error("Email already registered");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const now = new Date().toISOString();
  const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const user: AuthUser = {
    id: crypto.randomUUID(),
    email: email.toLowerCase().trim(),
    passwordHash,
    name: name.trim(),
    role: "user",
    createdAt: now,
    profile: {
      profession: "",
      company: "",
      bio: "",
      skills: [],
      audienceSize: 0,
      socialMedia: {},
    },
    subscription: {
      plan: "starter",
      status: "trial",
      startedAt: now,
      endsAt: trialEnd,
    },
    settings: {
      notifications: true,
      emailAlerts: true,
      autoReply: false,
      autoTasks: true,
      smartPriority: true,
      weeklyReport: true,
      darkMode: true,
      language: "en",
    },
  };

  _store.users.push(user);
  persistAuthStore();
  return user;
}

export async function validatePassword(user: AuthUser, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export function createToken(user: AuthUser): string {
  const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function updateUser(id: string, updates: Partial<Omit<AuthUser, "id" | "passwordHash" | "createdAt">>): AuthUser | null {
  const idx = _store.users.findIndex((u) => u.id === id);
  if (idx < 0) return null;
  _store.users[idx] = { ..._store.users[idx]!, ...updates };
  persistAuthStore();
  return _store.users[idx]!;
}

export function publicUser(user: AuthUser): Omit<AuthUser, "passwordHash"> {
  const { passwordHash: _, ...pub } = user;
  return pub;
}

export function getUserCount(): number {
  return _store.users.length;
}
