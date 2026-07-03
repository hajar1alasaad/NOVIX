import { addLog, addApproval, addOutreach, setAgentStatus, getStore } from "../lib/store.js";
import type OpenAI from "openai";

const AGENT = "negotiation";

export async function prepareOutreach(openai: OpenAI, opportunityId: string): Promise<string> {
  const store = getStore();
  const opp = store.opportunities.find((o) => o.id === opportunityId);
  if (!opp) return "";

  const profile = store.userProfile;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 600,
    messages: [
      {
        role: "system",
        content: `You are an elite negotiation agent for ${profile.name || "a professional"}.
Write confident, personalized outreach emails. Be specific, concise, and compelling.
Never be generic. Always highlight unique value. Aim for a response rate above 30%.`,
      },
      {
        role: "user",
        content: `Write an outreach email for this opportunity:
Title: ${opp.title}
Company: ${opp.company ?? "Unknown"}
Description: ${opp.description}
Type: ${opp.type}

My profile:
Profession: ${profile.profession}
Skills: ${profile.skills.join(", ")}
Min rate: $${profile.minRate}

Keep under 150 words. Be direct. Include a clear CTA.`,
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}

export async function negotiateOffer(openai: OpenAI, currentOffer: string, minRate: number): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content: "You are a skilled negotiator. Write a professional counter-offer email that politely increases the offer while maintaining the relationship.",
      },
      {
        role: "user",
        content: `Current offer details: ${currentOffer}\nMinimum rate: $${minRate}\nWrite a counter-offer increasing the price by 30-50% with professional justification:`,
      },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}

export async function run(openai: OpenAI): Promise<void> {
  const store = getStore();

  setAgentStatus(AGENT, {
    displayName: "Negotiation Agent",
    icon: "trending-up",
    status: "running",
    lastRun: new Date().toISOString(),
  });

  // Find approved opportunities that need outreach drafted
  const approved = store.opportunities
    .filter((o) => o.status === "approved")
    .slice(0, 3);

  let drafted = 0;
  for (const opp of approved) {
    // Check if outreach already drafted
    const existing = store.outreachHistory.find((r) => r.opportunityId === opp.id);
    if (existing) continue;

    const draft = await prepareOutreach(openai, opp.id);
    if (!draft) continue;

    const record = addOutreach({
      company: opp.company ?? opp.title,
      subject: `Collaboration inquiry — ${opp.title}`,
      type: "initial",
      status: "pending_approval",
      body: draft,
      opportunityId: opp.id,
    });

    addApproval({
      type: "send_email",
      title: `Outreach ready: ${opp.company ?? opp.title}`,
      description: `Negotiation Agent prepared a personalized outreach email for "${opp.title}". Review before sending.`,
      agent: AGENT,
      opportunityId: opp.id,
      draft,
    });

    addLog({ agent: AGENT, action: "Draft prepared", detail: `Outreach drafted for: ${opp.title}`, status: "success" });
    drafted++;

    void record;
  }

  const action = drafted > 0 ? `Drafted ${drafted} outreach emails` : "No new approved opportunities to process";
  addLog({ agent: AGENT, action: "Negotiation scan complete", detail: action, status: drafted > 0 ? "success" : "info" });

  setAgentStatus(AGENT, {
    status: "success",
    lastAction: action,
    successCount: (store.agentStatus[AGENT]?.successCount ?? 0) + 1,
    runCount: (store.agentStatus[AGENT]?.runCount ?? 0) + 1,
  });
}
