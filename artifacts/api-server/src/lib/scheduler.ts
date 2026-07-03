import { logger } from "./logger.js";
import { getStore, addLog } from "./store.js";
import { run as runSupervisor } from "../agents/supervisor-agent.js";
import OpenAI from "openai";

let isRunning = false;
let intervalHandle: ReturnType<typeof setInterval> | null = null;
let lastFullRun: Date | null = null;

const FULL_CYCLE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

function createOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });
}

async function runCycle(): Promise<void> {
  if (isRunning) {
    logger.info("[Scheduler] Previous cycle still running, skipping.");
    return;
  }

  const now = new Date();

  // Only run if enough time has passed or this is the first run
  if (lastFullRun) {
    const elapsed = now.getTime() - lastFullRun.getTime();
    if (elapsed < FULL_CYCLE_INTERVAL_MS) return;
  }

  isRunning = true;
  lastFullRun = now;

  logger.info("[Scheduler] Starting agent orchestration cycle");
  addLog({ agent: "scheduler", action: "Cycle started", detail: `Full agent cycle at ${now.toLocaleTimeString()}`, status: "info" });

  try {
    const openai = createOpenAI();
    await runSupervisor(openai);
    logger.info("[Scheduler] Agent cycle completed successfully");
  } catch (err) {
    logger.error({ err }, "[Scheduler] Agent cycle failed");
    addLog({ agent: "scheduler", action: "Cycle failed", detail: String(err), status: "error" });
  } finally {
    isRunning = false;
  }
}

export function startScheduler(): void {
  logger.info("[Scheduler] Starting background agent scheduler");

  // Run first cycle after a short delay to let server fully start
  setTimeout(() => { void runCycle(); }, 5_000);

  // Check every minute if it's time to run
  intervalHandle = setInterval(() => { void runCycle(); }, 60_000);

  logger.info(`[Scheduler] Agent cycle scheduled every ${FULL_CYCLE_INTERVAL_MS / 60000} minutes`);
}

export function stopScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info("[Scheduler] Scheduler stopped");
  }
}

export function triggerManualRun(): Promise<void> {
  if (isRunning) return Promise.reject(new Error("Cycle already running"));
  lastFullRun = null; // Force run
  return runCycle();
}

export function getSchedulerStatus(): { isRunning: boolean; lastRun: string | null; nextRun: string | null } {
  const nextRun = lastFullRun
    ? new Date(lastFullRun.getTime() + FULL_CYCLE_INTERVAL_MS).toISOString()
    : null;
  return {
    isRunning,
    lastRun: lastFullRun?.toISOString() ?? null,
    nextRun,
  };
}

export function runSingleAgent(agentName: string): Promise<void> {
  const openai = createOpenAI();
  const store = getStore();
  void store;

  const agents: Record<string, (openai: OpenAI) => Promise<void>> = {};

  return import("../agents/opportunity-agent.js").then(({ run: runOpp }) => {
    agents["opportunity"] = runOpp;
    return import("../agents/memory-agent.js");
  }).then(({ run: runMem }) => {
    agents["memory"] = runMem;
    return import("../agents/browser-agent.js");
  }).then(({ run: runBr }) => {
    agents["browser"] = runBr;
    return import("../agents/negotiation-agent.js");
  }).then(({ run: runNeg }) => {
    agents["negotiation"] = runNeg;
    return import("../agents/outreach-agent.js");
  }).then(({ run: runOut }) => {
    agents["outreach"] = runOut;
    return import("../agents/career-agent.js");
  }).then(({ run: runCar }) => {
    agents["career"] = runCar;
    return import("../agents/finance-agent.js");
  }).then(({ run: runFin }) => {
    agents["finance"] = runFin;
    return import("../agents/email-agent.js");
  }).then(({ run: runEmail }) => {
    agents["email"] = runEmail;
    return import("../agents/social-agent.js");
  }).then(({ run: runSoc }) => {
    agents["social"] = runSoc;
    return import("../agents/calendar-agent.js");
  }).then(({ run: runCal }) => {
    agents["calendar"] = runCal;
    return import("../agents/supervisor-agent.js");
  }).then(({ run: runSup }) => {
    agents["supervisor"] = runSup;
    const fn = agents[agentName];
    if (!fn) throw new Error(`Unknown agent: ${agentName}`);
    return fn(openai);
  });
}
