import { addLog, addMemory, setAgentStatus, getStore } from "../lib/store.js";
import type OpenAI from "openai";

const AGENT = "career";

export async function analyzeCareer(openai: OpenAI): Promise<string> {
  const store = getStore();
  const p = store.userProfile;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 700,
    messages: [
      {
        role: "system",
        content: "You are a career strategist for creators and professionals. Provide specific, actionable career advice.",
      },
      {
        role: "user",
        content: `Analyze the career profile and provide strategic recommendations:

Profession: ${p.profession || "Not specified"}
Skills: ${p.skills.join(", ") || "Not specified"}
Goals: ${p.careerGoals.join(", ") || "Not specified"}
Audience size: ${p.audienceSize.toLocaleString()}
Min rate: $${p.minRate}
Preferred opportunity types: ${p.preferredCategories.join(", ")}

Provide:
1. 3 specific career improvement recommendations
2. 2 emerging opportunities in your field to pursue now
3. 1 skill gap to address
4. Realistic income projection if recommendations are followed`,
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}

export async function suggestBrandPartnerships(openai: OpenAI): Promise<string[]> {
  const store = getStore();
  const p = store.userProfile;
  if (!p.profession) return [];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 400,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Return JSON: {"brands": ["brand1", "brand2", ...]}`,
      },
      {
        role: "user",
        content: `List 8 real brands that commonly partner with ${p.profession}s for sponsorships or ambassadorships. Include a mix of well-known and emerging brands.`,
      },
    ],
  });

  try {
    const data = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as { brands?: string[] };
    return data.brands ?? [];
  } catch {
    return [];
  }
}

export async function run(openai: OpenAI): Promise<void> {
  const store = getStore();

  setAgentStatus(AGENT, {
    displayName: "Career Manager",
    icon: "award",
    status: "running",
    lastRun: new Date().toISOString(),
  });

  if (!store.userProfile.profession) {
    setAgentStatus(AGENT, { status: "needs_config", lastAction: "Profile not configured", configRequired: ["profession"], runCount: (store.agentStatus[AGENT]?.runCount ?? 0) + 1 });
    return;
  }

  // Analyze career and store key insights in memory
  const [analysis, brands] = await Promise.all([
    analyzeCareer(openai),
    suggestBrandPartnerships(openai),
  ]);

  if (analysis) {
    addMemory({ key: "career_analysis_latest", value: analysis, category: "career", source: AGENT });
    addLog({ agent: AGENT, action: "Career analysis", detail: "Updated career strategy and recommendations", status: "success" });
  }

  if (brands.length > 0) {
    addMemory({ key: "recommended_brand_partners", value: brands.join(", "), category: "brand", source: AGENT });
    addLog({ agent: AGENT, action: "Brand recommendations", detail: `Identified ${brands.length} brand partnership targets: ${brands.slice(0, 3).join(", ")}...`, status: "success" });
  }

  const action = `Career analysis updated · ${brands.length} brand targets identified`;
  setAgentStatus(AGENT, {
    status: "success",
    lastAction: action,
    successCount: (store.agentStatus[AGENT]?.successCount ?? 0) + 1,
    runCount: (store.agentStatus[AGENT]?.runCount ?? 0) + 1,
  });
}
