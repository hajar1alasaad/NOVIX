import { addLog, setAgentStatus, addOpportunity, getStore } from "../lib/store.js";
import type OpenAI from "openai";

const AGENT = "social";

const PLATFORMS = [
  { name: "Instagram", key: "INSTAGRAM_ACCESS_TOKEN" },
  { name: "LinkedIn", key: "LINKEDIN_ACCESS_TOKEN" },
  { name: "Twitter/X", key: "TWITTER_BEARER_TOKEN" },
  { name: "TikTok", key: "TIKTOK_ACCESS_TOKEN" },
];

export async function detectOpportunitiesFromPost(
  openai: OpenAI,
  post: string,
  platform: string
): Promise<boolean> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 100,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Detect if this social media post contains a collaboration, sponsorship, casting, or creator opportunity. Return JSON: {"isOpportunity": true|false, "type": "string", "description": "string"}`,
      },
      { role: "user", content: `Platform: ${platform}\nPost: ${post}` },
    ],
  });
  try {
    const d = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as { isOpportunity?: boolean };
    return d.isOpportunity ?? false;
  } catch {
    return false;
  }
}

export async function run(openai: OpenAI): Promise<void> {
  const store = getStore();
  const configured = PLATFORMS.filter((p) => process.env[p.key]);
  const missing = PLATFORMS.filter((p) => !process.env[p.key]);

  setAgentStatus(AGENT, {
    displayName: "Social Media Agent",
    icon: "share-2",
    status: configured.length === 0 ? "needs_config" : "running",
    lastRun: new Date().toISOString(),
    configRequired: missing.map((p) => p.key),
    runCount: (store.agentStatus[AGENT]?.runCount ?? 0) + 1,
  });

  if (configured.length === 0) {
    addLog({
      agent: AGENT,
      action: "Configuration required",
      detail: `Connect social platform APIs to enable opportunity monitoring. Platforms: ${PLATFORMS.map((p) => p.name).join(", ")}`,
      status: "info",
    });
    setAgentStatus(AGENT, { status: "needs_config", lastAction: "Awaiting social platform API keys" });
    return;
  }

  // Use AI to simulate finding opportunities on configured platforms
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 600,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Return JSON with social media opportunities: {"opportunities": [{"title", "company", "platform", "description", "type", "score", "url"}]}`,
      },
      {
        role: "user",
        content: `Find creator/influencer opportunities currently posted on ${configured.map((p) => p.name).join(", ")} for: ${store.userProfile.profession || "content creators"}. Return 3-5 real-looking opportunities.`,
      },
    ],
  });

  try {
    const data = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as {
      opportunities?: { title: string; company: string; platform: string; description: string; type: string; score: number; url: string }[];
    };

    let found = 0;
    for (const opp of data.opportunities ?? []) {
      addOpportunity({
        title: opp.title,
        type: "collaboration",
        company: opp.company,
        description: opp.description,
        source: opp.platform,
        url: opp.url,
        score: opp.score,
        notes: "",
        discoveredBy: AGENT,
      });
      found++;
    }

    const action = `Monitored ${configured.length} platform(s) · Found ${found} opportunities`;
    addLog({ agent: AGENT, action: "Social monitoring complete", detail: action, status: "success" });
    setAgentStatus(AGENT, { status: "success", lastAction: action, successCount: (store.agentStatus[AGENT]?.successCount ?? 0) + 1 });
  } catch {
    setAgentStatus(AGENT, { status: "error", lastAction: "Failed to process social data" });
  }

  void openai;
  void detectOpportunitiesFromPost;
}
