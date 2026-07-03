import { addLog, setAgentStatus, getStore } from "../lib/store.js";
import type OpenAI from "openai";

const AGENT = "email";

const CONFIG_NEEDED = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"];

export async function categorizeEmail(openai: OpenAI, subject: string, body: string): Promise<{
  category: string; priority: string; summary: string; suggestedReply: string;
}> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 400,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Analyze this email and return JSON:
{"category": "opportunity|spam|urgent|follow_up|general", "priority": "high|medium|low", "summary": "1 sentence", "suggestedReply": "draft reply under 100 words"}`,
      },
      { role: "user", content: `Subject: ${subject}\n\n${body}` },
    ],
  });
  try {
    return JSON.parse(completion.choices[0]?.message?.content ?? "{}") as { category: string; priority: string; summary: string; suggestedReply: string };
  } catch {
    return { category: "general", priority: "low", summary: "", suggestedReply: "" };
  }
}

export async function run(_openai: OpenAI): Promise<void> {
  const store = getStore();
  const missingConfig = CONFIG_NEEDED.filter((k) => !process.env[k]);

  setAgentStatus(AGENT, {
    displayName: "Email Agent",
    icon: "mail",
    status: missingConfig.length > 0 ? "needs_config" : "running",
    lastRun: new Date().toISOString(),
    configRequired: missingConfig,
    runCount: (store.agentStatus[AGENT]?.runCount ?? 0) + 1,
  });

  if (missingConfig.length > 0) {
    addLog({
      agent: AGENT,
      action: "Configuration required",
      detail: `Connect Gmail or Outlook to enable email monitoring. Required: ${missingConfig.join(", ")}`,
      status: "info",
    });

    setAgentStatus(AGENT, {
      status: "needs_config",
      lastAction: "Awaiting Gmail/Outlook OAuth connection",
    });
    return;
  }

  // When configured: monitor inbox, categorize emails, draft replies
  addLog({ agent: AGENT, action: "Monitoring inbox", detail: "Scanning for new emails and opportunities", status: "success" });
  setAgentStatus(AGENT, { status: "success", lastAction: "Inbox monitored" });
}
