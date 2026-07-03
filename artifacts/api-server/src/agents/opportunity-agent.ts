import { addLog, addOpportunity, setAgentStatus, addApproval, getStore } from "../lib/store.js";
import { searchWeb } from "./browser-agent.js";
import type OpenAI from "openai";
import type { OpportunityType } from "../lib/store.js";

const AGENT = "opportunity";

interface RawOpportunity {
  title: string;
  type: OpportunityType;
  company: string;
  description: string;
  estimatedValue: number;
  score: number;
  url: string;
  requirements: string;
  source: string;
}

async function generateOpportunities(openai: OpenAI, profession: string, skills: string[]): Promise<RawOpportunity[]> {
  const categories = [
    "podcast guest invitations",
    "brand sponsorships and ambassador programs",
    "speaking opportunities and conferences",
    "UGC and content creation campaigns",
    "business partnerships and collaborations",
    "freelance projects",
    "casting calls and media appearances",
    "influencer marketing campaigns",
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 2000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an Opportunity Discovery AI. Find realistic, specific opportunities for professionals.
Return JSON: {"opportunities": [array of opportunity objects]}

Each opportunity must have:
- title: specific opportunity name
- type: one of sponsorship|casting|podcast|speaking|ugc|partnership|freelance|ambassador|collaboration|event
- company: real company or platform that offers this
- description: 2-3 sentence description of what this opportunity involves
- estimatedValue: realistic USD value (number, 0 if unknown)
- score: relevance score 0-100
- url: realistic URL where this opportunity would be found
- requirements: what the applicant needs
- source: where this was found (e.g., "LinkedIn Jobs", "Company website", "Creator marketplace")`,
      },
      {
        role: "user",
        content: `Find 8 realistic opportunities for a ${profession} with skills: ${skills.join(", ")}.
Categories to search: ${categories.join(", ")}.
Make them specific, actionable, and from real brands/platforms that actually offer such opportunities.`,
      },
    ],
  });

  try {
    const data = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as { opportunities?: RawOpportunity[] };
    return data.opportunities ?? [];
  } catch {
    return [];
  }
}

async function searchLiveOpportunities(profession: string): Promise<RawOpportunity[]> {
  const queries = [
    `${profession} brand collaboration opportunities 2024`,
    `${profession} podcast guest speaker opportunities`,
    `${profession} sponsorship program open applications`,
  ];

  const results: RawOpportunity[] = [];

  for (const query of queries.slice(0, 2)) {
    const searchResults = await searchWeb(query);
    for (const r of searchResults.slice(0, 3)) {
      if (r.title && r.snippet) {
        results.push({
          title: r.title,
          type: "other" as OpportunityType,
          company: new URL(r.url.startsWith("http") ? r.url : `https://${r.url}`).hostname,
          description: r.snippet,
          estimatedValue: 0,
          score: 60,
          url: r.url,
          requirements: "See link for details",
          source: "Web Search",
        });
      }
    }
  }

  return results;
}

export async function run(openai: OpenAI): Promise<void> {
  const store = getStore();
  const profile = store.userProfile;

  setAgentStatus(AGENT, {
    displayName: "Opportunity Discovery",
    icon: "zap",
    status: "running",
    lastRun: new Date().toISOString(),
  });

  if (!profile.profession) {
    addLog({ agent: AGENT, action: "Skipped", detail: "User profession not configured. Go to Settings → Agent Profile.", status: "info" });
    setAgentStatus(AGENT, {
      status: "needs_config",
      lastAction: "Profile not configured",
      configRequired: ["profession"],
      runCount: (store.agentStatus[AGENT]?.runCount ?? 0) + 1,
    });
    return;
  }

  addLog({ agent: AGENT, action: "Scanning", detail: `Searching for opportunities for: ${profile.profession}`, status: "info" });

  // Run both AI generation and live web search in parallel
  const [aiOpps, liveOpps] = await Promise.all([
    generateOpportunities(openai, profile.profession, profile.skills),
    searchLiveOpportunities(profile.profession),
  ]);

  const allOpps = [...aiOpps, ...liveOpps];
  let saved = 0;

  for (const opp of allOpps) {
    if (opp.score < 50) continue;
    const entry = addOpportunity({
      title: opp.title,
      type: opp.type,
      company: opp.company,
      description: opp.description,
      estimatedValue: opp.estimatedValue,
      score: opp.score,
      url: opp.url,
      requirements: opp.requirements,
      source: opp.source,
      notes: "",
      discoveredBy: AGENT,
    });

    if (entry.status === "new" && opp.score >= 80) {
      addApproval({
        type: "submit_application",
        title: `High-value opportunity: ${opp.title}`,
        description: `Score: ${opp.score}/100 | Est. value: $${opp.estimatedValue || "unknown"} | ${opp.description}`,
        agent: AGENT,
        opportunityId: entry.id,
        draft: `Apply to: ${opp.url}`,
      });
    }

    saved++;
  }

  addLog({
    agent: AGENT,
    action: "Discovery complete",
    detail: `Found ${saved} new opportunities for ${profile.profession}`,
    status: "success",
  });

  setAgentStatus(AGENT, {
    status: "success",
    lastAction: `Found ${saved} opportunities`,
    successCount: (store.agentStatus[AGENT]?.successCount ?? 0) + 1,
    runCount: (store.agentStatus[AGENT]?.runCount ?? 0) + 1,
  });
}
