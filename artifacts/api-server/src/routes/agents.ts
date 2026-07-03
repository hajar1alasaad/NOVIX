import { Router } from "express";
import {
  getStore,
  updateProfile,
  resolveApproval,
  addLog,
  updateOpportunity,
  persistStore,
} from "../lib/store.js";
import { triggerManualRun, runSingleAgent, getSchedulerStatus } from "../lib/scheduler.js";

const router = Router();

// GET /api/agents/status — all agent statuses + scheduler info
router.get("/agents/status", (_req, res) => {
  const store = getStore();
  const scheduler = getSchedulerStatus();
  res.json({
    agents: Object.values(store.agentStatus),
    scheduler,
    summary: {
      totalOpportunities: store.opportunities.length,
      newOpportunities: store.opportunities.filter((o) => o.status === "new").length,
      pendingApprovals: store.pendingApprovals.filter((a) => a.status === "pending").length,
      memoryEntries: store.memory.length,
    },
  });
});

// GET /api/agents/logs?limit=50&agent=opportunity
router.get("/agents/logs", (req, res) => {
  const store = getStore();
  const limit = Math.min(Number(req.query["limit"] ?? 50), 200);
  const agentFilter = req.query["agent"] as string | undefined;

  let logs = store.agentLogs;
  if (agentFilter) logs = logs.filter((l) => l.agent === agentFilter);

  res.json({ logs: logs.slice(0, limit), total: store.agentLogs.length });
});

// GET /api/agents/opportunities?status=new&limit=20
router.get("/agents/opportunities", (req, res) => {
  const store = getStore();
  const limit = Math.min(Number(req.query["limit"] ?? 20), 100);
  const statusFilter = req.query["status"] as string | undefined;
  const typeFilter = req.query["type"] as string | undefined;

  let opps = store.opportunities;
  if (statusFilter) opps = opps.filter((o) => o.status === statusFilter);
  if (typeFilter) opps = opps.filter((o) => o.type === typeFilter);

  opps = opps.sort((a, b) => b.score - a.score);

  res.json({ opportunities: opps.slice(0, limit), total: opps.length });
});

// PUT /api/agents/opportunities/:id — update opportunity status
router.put("/agents/opportunities/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body as { status?: import("../lib/store.js").OpportunityStatus; notes?: string };
  updateOpportunity(id, updates);
  persistStore();
  res.json({ success: true });
});

// GET /api/agents/approvals — pending approvals
router.get("/agents/approvals", (_req, res) => {
  const store = getStore();
  res.json({
    approvals: store.pendingApprovals.filter((a) => a.status === "pending"),
    total: store.pendingApprovals.length,
  });
});

// POST /api/agents/approvals/:id — approve or reject
router.post("/agents/approvals/:id", (req, res) => {
  const { id } = req.params;
  const { approved } = req.body as { approved: boolean };
  resolveApproval(id, approved);
  persistStore();
  addLog({
    agent: "user",
    action: approved ? "Approved" : "Rejected",
    detail: `User ${approved ? "approved" : "rejected"} action ${id}`,
    status: approved ? "success" : "info",
  });
  res.json({ success: true });
});

// GET /api/agents/profile — get user profile
router.get("/agents/profile", (_req, res) => {
  const store = getStore();
  res.json({ profile: store.userProfile });
});

// POST /api/agents/profile — update user profile
router.post("/agents/profile", (req, res) => {
  const updates = req.body as Record<string, unknown>;
  updateProfile(updates);
  persistStore();
  addLog({ agent: "user", action: "Profile updated", detail: `Updated fields: ${Object.keys(updates).join(", ")}`, status: "success" });
  res.json({ success: true, profile: getStore().userProfile });
});

// GET /api/agents/report — latest daily report
router.get("/agents/report", (_req, res) => {
  const store = getStore();
  res.json({ report: store.dailyReports[0] ?? null, history: store.dailyReports.slice(0, 7) });
});

// GET /api/agents/memory — agent memory
router.get("/agents/memory", (_req, res) => {
  const store = getStore();
  res.json({ memory: store.memory, total: store.memory.length });
});

// GET /api/agents/outreach — outreach history
router.get("/agents/outreach", (_req, res) => {
  const store = getStore();
  res.json({ outreach: store.outreachHistory, total: store.outreachHistory.length });
});

// GET /api/agents/invoices — invoices
router.get("/agents/invoices", (_req, res) => {
  const store = getStore();
  res.json({ invoices: store.invoices });
});

// POST /api/agents/run — trigger manual full cycle
router.post("/agents/run", async (_req, res) => {
  try {
    void triggerManualRun();
    res.json({ success: true, message: "Agent cycle triggered" });
  } catch (err) {
    res.status(409).json({ error: String(err) });
  }
});

// POST /api/agents/run/:name — trigger specific agent
router.post("/agents/run/:name", async (req, res) => {
  const { name } = req.params;
  try {
    void runSingleAgent(name);
    res.json({ success: true, message: `Agent "${name}" triggered` });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// GET /api/agents/finance — financial summary
router.get("/agents/finance", (_req, res) => {
  const store = getStore();
  const invoices = store.invoices;
  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter((i) => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + i.amount, 0);
  const wonValue = store.opportunities.filter((o) => o.status === "won").reduce((s, o) => s + (o.estimatedValue ?? 0), 0);
  res.json({ totalInvoiced, totalPaid, outstanding, wonValue, invoices });
});

export default router;
