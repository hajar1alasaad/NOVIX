import { addLog, addDailyReport, setAgentStatus, getStore, persistStore } from "../lib/store.js";
import { run as runMemory } from "./memory-agent.js";
import { run as runBrowser } from "./browser-agent.js";
import { run as runOpportunity } from "./opportunity-agent.js";
import { run as runNegotiation } from "./negotiation-agent.js";
import { run as runOutreach } from "./outreach-agent.js";
import { run as runEmail } from "./email-agent.js";
import { run as runSocial } from "./social-agent.js";
import { run as runCalendar } from "./calendar-agent.js";
import { run as runFinance } from "./finance-agent.js";
import { run as runCareer } from "./career-agent.js";
import type OpenAI from "openai";

const AGENT = "supervisor";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function safeRun(
  name: string,
  fn: (openai: OpenAI) => Promise<void>,
  openai: OpenAI
): Promise<void> {
  try {
    await fn(openai);
  } catch (err) {
    addLog({ agent: name, action: "Agent error", detail: String(err), status: "error" });
    setAgentStatus(name, {
      status: "error",
      lastAction: `Error: ${String(err).slice(0, 100)}`,
      errorCount: (getStore().agentStatus[name]?.errorCount ?? 0) + 1,
    });
  }
}

export async function generateDailyReport(openai: OpenAI): Promise<void> {
  const store = getStore();
  const recentLogs = store.agentLogs.slice(0, 30);
  const newOpps = store.opportunities.filter((o) => {
    const age = Date.now() - new Date(o.discoveredAt).getTime();
    return age < 24 * 60 * 60 * 1000;
  });
  const pending = store.pendingApprovals.filter((a) => a.status === "pending");

  const context = `
Agent activity summary (last 24 hours):
- New opportunities discovered: ${newOpps.length}
- Pending approvals awaiting user: ${pending.length}
- Agent logs: ${recentLogs.map((l) => `[${l.agent}] ${l.action}: ${l.detail}`).join(" | ").slice(0, 1000)}
- Total opportunities in pipeline: ${store.opportunities.length}
- Active negotiations: ${store.opportunities.filter((o) => o.status === "negotiating").length}
- Won deals: ${store.opportunities.filter((o) => o.status === "won").length}
  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 700,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are the Supervisor AI. Generate a concise daily executive report. Return JSON:
{"summary": "2-3 sentence overview", "highlights": ["array of 3-5 key achievements"], "recommendations": ["array of 3 action items for user"]}`,
      },
      { role: "user", content: context },
    ],
  });

  try {
    const data = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as {
      summary?: string;
      highlights?: string[];
      recommendations?: string[];
    };

    addDailyReport({
      date: new Date().toISOString().split("T")[0],
      summary: data.summary ?? "Agents completed their daily tasks.",
      opportunitiesFound: newOpps.length,
      actionsCompleted: recentLogs.filter((l) => l.status === "success").length,
      pendingApprovals: pending.length,
      highlights: data.highlights ?? [],
      recommendations: data.recommendations ?? [],
    });

    addLog({ agent: AGENT, action: "Daily report generated", detail: data.summary?.slice(0, 100) ?? "", status: "success" });
  } catch {
    addLog({ agent: AGENT, action: "Report generation failed", detail: "Could not parse AI response", status: "error" });
  }
}

export async function run(openai: OpenAI): Promise<void> {
  const store = getStore();

  setAgentStatus(AGENT, {
    displayName: "Supervisor Agent",
    icon: "cpu",
    status: "running",
    lastRun: new Date().toISOString(),
  });

  addLog({ agent: AGENT, action: "Orchestration started", detail: "Running all agents in sequence", status: "info" });

  // Run agents with staggered delays to avoid rate limits
  await safeRun("memory", runMemory, openai);
  await sleep(2000);

  await safeRun("opportunity", runOpportunity, openai);
  await sleep(2000);

  await safeRun("social", runSocial, openai);
  await sleep(1000);

  await safeRun("email", runEmail, openai);
  await sleep(1000);

  await safeRun("browser", runBrowser, openai);
  await sleep(2000);

  await safeRun("negotiation", runNegotiation, openai);
  await sleep(2000);

  await safeRun("outreach", runOutreach, openai);
  await sleep(2000);

  await safeRun("calendar", runCalendar, openai);
  await sleep(1000);

  await safeRun("finance", runFinance, openai);
  await sleep(2000);

  await safeRun("career", runCareer, openai);
  await sleep(2000);

  // Generate daily report at end of cycle
  await generateDailyReport(openai);

  // Persist all changes
  persistStore();

  const finalStore = getStore();
  const totalOpps = finalStore.opportunities.length;
  const pendingApprovals = finalStore.pendingApprovals.filter((a) => a.status === "pending").length;

  const action = `All 10 agents completed · ${totalOpps} opportunities · ${pendingApprovals} awaiting approval`;
  addLog({ agent: AGENT, action: "Orchestration complete", detail: action, status: "success" });

  setAgentStatus(AGENT, {
    status: "success",
    lastAction: action,
    successCount: (finalStore.agentStatus[AGENT]?.successCount ?? 0) + 1,
    runCount: (finalStore.agentStatus[AGENT]?.runCount ?? 0) + 1,
  });
}
