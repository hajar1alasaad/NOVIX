import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.resolve(process.cwd(), "agents-data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

export interface UserProfile {
  name: string;
  profession: string;
  skills: string[];
  experience: string;
  portfolio: string;
  socialMedia: Record<string, string>;
  audienceSize: number;
  minRate: number;
  maxWorkload: number;
  careerGoals: string[];
  brandPreferences: string[];
  preferredCategories: string[];
  updatedAt: string;
}

export type OpportunityType =
  | "sponsorship" | "casting" | "podcast" | "speaking"
  | "ugc" | "partnership" | "freelance" | "ambassador"
  | "collaboration" | "event" | "other";

export type OpportunityStatus =
  | "new" | "reviewing" | "approved" | "rejected"
  | "contacted" | "negotiating" | "won" | "lost";

export interface Opportunity {
  id: string;
  title: string;
  type: OpportunityType;
  source: string;
  url: string;
  description: string;
  company?: string;
  estimatedValue?: number;
  deadline?: string;
  status: OpportunityStatus;
  discoveredAt: string;
  discoveredBy: string;
  score: number;
  notes: string;
  requirements?: string;
}

export interface AgentLog {
  id: string;
  agent: string;
  action: string;
  detail: string;
  timestamp: string;
  status: "success" | "error" | "info" | "pending";
}

export type AgentStatusCode = "idle" | "running" | "success" | "error" | "waiting" | "needs_config";

export interface AgentStatus {
  name: string;
  displayName: string;
  icon: string;
  status: AgentStatusCode;
  lastRun?: string;
  lastAction?: string;
  runCount: number;
  successCount: number;
  errorCount: number;
  configRequired?: string[];
}

export interface Approval {
  id: string;
  type: "send_email" | "submit_application" | "accept_offer" | "book_meeting" | "send_proposal" | "negotiate" | "other";
  title: string;
  description: string;
  agent: string;
  opportunityId?: string;
  draft?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  resolvedAt?: string;
}

export interface OutreachRecord {
  id: string;
  company: string;
  contact?: string;
  email?: string;
  subject: string;
  type: "initial" | "follow_up" | "proposal" | "negotiation";
  status: "draft" | "pending_approval" | "sent" | "replied" | "negotiating" | "won" | "lost";
  body: string;
  opportunityId?: string;
  createdAt: string;
}

export interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  category: "client" | "brand" | "preference" | "rule" | "history" | "career" | "general";
  source: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  client: string;
  amount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue";
  description: string;
  dueDate: string;
  createdAt: string;
}

export interface AgentMeeting {
  id: string;
  title: string;
  withContact: string;
  date: string;
  duration: number;
  platform: string;
  agenda: string;
  status: "scheduled" | "completed" | "cancelled";
  createdAt: string;
}

export interface DailyReport {
  id: string;
  date: string;
  generatedAt: string;
  summary: string;
  opportunitiesFound: number;
  actionsCompleted: number;
  pendingApprovals: number;
  highlights: string[];
  recommendations: string[];
}

export interface AgentStore {
  userProfile: UserProfile;
  opportunities: Opportunity[];
  agentLogs: AgentLog[];
  agentStatus: Record<string, AgentStatus>;
  pendingApprovals: Approval[];
  outreachHistory: OutreachRecord[];
  memory: MemoryEntry[];
  invoices: Invoice[];
  meetings: AgentMeeting[];
  dailyReports: DailyReport[];
}

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  profession: "",
  skills: [],
  experience: "",
  portfolio: "",
  socialMedia: {},
  audienceSize: 0,
  minRate: 500,
  maxWorkload: 10,
  careerGoals: [],
  brandPreferences: [],
  preferredCategories: ["sponsorship", "podcast", "speaking", "collaboration"],
  updatedAt: new Date().toISOString(),
};

let _store: AgentStore = {
  userProfile: DEFAULT_PROFILE,
  opportunities: [],
  agentLogs: [],
  agentStatus: {},
  pendingApprovals: [],
  outreachHistory: [],
  memory: [],
  invoices: [],
  meetings: [],
  dailyReports: [],
};

let _dirty = false;

export function initStore(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw) as Partial<AgentStore>;
      _store = { ..._store, ...parsed };
    } else {
      persistStore();
    }
  } catch {
    _store = { ..._store };
  }
}

export function getStore(): AgentStore { return _store; }

export function persistStore(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DATA_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(_store, null, 2), "utf-8");
    fs.renameSync(tmp, DATA_FILE);
    _dirty = false;
  } catch { /* ignore */ }
}

setInterval(() => { if (_dirty) persistStore(); }, 30_000);

export const generateId = () => crypto.randomUUID();

export function updateProfile(p: Partial<UserProfile>): void {
  _store.userProfile = { ..._store.userProfile, ...p, updatedAt: new Date().toISOString() };
  _dirty = true;
}

export function addOpportunity(opp: Omit<Opportunity, "id" | "discoveredAt" | "status">): Opportunity {
  const dup = _store.opportunities.find(
    (o) => o.title.toLowerCase() === opp.title.toLowerCase() || (opp.url && o.url === opp.url)
  );
  if (dup) return dup;
  const entry: Opportunity = { ...opp, id: generateId(), discoveredAt: new Date().toISOString(), status: "new" };
  _store.opportunities.unshift(entry);
  if (_store.opportunities.length > 500) _store.opportunities = _store.opportunities.slice(0, 500);
  _dirty = true;
  return entry;
}

export function updateOpportunity(id: string, updates: Partial<Opportunity>): void {
  _store.opportunities = _store.opportunities.map((o) => (o.id === id ? { ...o, ...updates } : o));
  _dirty = true;
}

export function addLog(log: Omit<AgentLog, "id" | "timestamp">): void {
  _store.agentLogs.unshift({ ...log, id: generateId(), timestamp: new Date().toISOString() });
  if (_store.agentLogs.length > 1000) _store.agentLogs = _store.agentLogs.slice(0, 1000);
  _dirty = true;
}

export function setAgentStatus(name: string, s: Partial<AgentStatus>): void {
  _store.agentStatus[name] = { ..._store.agentStatus[name], name, ...s };
  _dirty = true;
}

export function addApproval(a: Omit<Approval, "id" | "createdAt" | "status">): Approval {
  const entry: Approval = { ...a, id: generateId(), createdAt: new Date().toISOString(), status: "pending" };
  _store.pendingApprovals.unshift(entry);
  _dirty = true;
  return entry;
}

export function resolveApproval(id: string, approved: boolean): void {
  _store.pendingApprovals = _store.pendingApprovals.map((a) =>
    a.id === id ? { ...a, status: approved ? "approved" : "rejected", resolvedAt: new Date().toISOString() } : a
  );
  _dirty = true;
}

export function addMemory(entry: Omit<MemoryEntry, "id" | "updatedAt">): void {
  const idx = _store.memory.findIndex((m) => m.key === entry.key);
  const now = new Date().toISOString();
  if (idx >= 0) {
    _store.memory[idx] = { ..._store.memory[idx], value: entry.value, updatedAt: now };
  } else {
    _store.memory.push({ ...entry, id: generateId(), updatedAt: now });
  }
  _dirty = true;
}

export function addOutreach(r: Omit<OutreachRecord, "id" | "createdAt">): OutreachRecord {
  const entry: OutreachRecord = { ...r, id: generateId(), createdAt: new Date().toISOString() };
  _store.outreachHistory.unshift(entry);
  _dirty = true;
  return entry;
}

export function addInvoice(inv: Omit<Invoice, "id" | "createdAt">): Invoice {
  const entry: Invoice = { ...inv, id: generateId(), createdAt: new Date().toISOString() };
  _store.invoices.unshift(entry);
  _dirty = true;
  return entry;
}

export function addDailyReport(r: Omit<DailyReport, "id" | "generatedAt">): DailyReport {
  const entry: DailyReport = { ...r, id: generateId(), generatedAt: new Date().toISOString() };
  _store.dailyReports.unshift(entry);
  if (_store.dailyReports.length > 30) _store.dailyReports = _store.dailyReports.slice(0, 30);
  _dirty = true;
  return entry;
}
