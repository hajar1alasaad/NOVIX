import { addLog, setAgentStatus, addApproval, getStore } from "../lib/store.js";
import type OpenAI from "openai";

const AGENT = "outreach";

export async function generateMediaKit(openai: OpenAI): Promise<string> {
  const store = getStore();
  const p = store.userProfile;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 800,
    messages: [
      {
        role: "system",
        content: "You are a professional media kit writer. Create compelling, concise media kits that win brand deals.",
      },
      {
        role: "user",
        content: `Create a professional media kit for:
Name: ${p.name || "Professional"}
Profession: ${p.profession || "Content Creator"}
Skills: ${p.skills.join(", ")}
Audience size: ${p.audienceSize.toLocaleString()}
Platforms: ${Object.keys(p.socialMedia).join(", ") || "Multiple platforms"}
Min rate: $${p.minRate}

Include: Bio, Audience stats, Services offered, Rates, Past collaborations section (leave blank for user to fill).
Format as a professional document.`,
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}

export async function generateSponsorshipProposal(
  openai: OpenAI,
  company: string,
  opportunityType: string
): Promise<string> {
  const store = getStore();
  const p = store.userProfile;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 700,
    messages: [
      {
        role: "system",
        content: "You are a sponsorship proposal specialist. Write proposals that convert at 40%+.",
      },
      {
        role: "user",
        content: `Write a sponsorship proposal for:
Target company: ${company}
Opportunity type: ${opportunityType}
My profession: ${p.profession}
Audience size: ${p.audienceSize.toLocaleString()}
Unique value proposition: ${p.skills.slice(0, 3).join(", ")}

Include: Executive summary, Audience overview, Deliverables, Timeline, Investment (starting at $${p.minRate}).
Keep under 400 words. Professional tone.`,
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}

export async function generatePitchDeck(openai: OpenAI, company: string): Promise<string> {
  const store = getStore();
  const p = store.userProfile;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 900,
    messages: [
      {
        role: "system",
        content: "Create a 6-slide pitch deck outline with key talking points for each slide.",
      },
      {
        role: "user",
        content: `Pitch deck for ${p.name || "Professional"} (${p.profession}) to partner with ${company}.
Audience: ${p.audienceSize.toLocaleString()} followers.
Skills: ${p.skills.join(", ")}.
Return a structured 6-slide deck with title and 3 bullet points per slide.`,
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}

export async function run(openai: OpenAI): Promise<void> {
  const store = getStore();

  setAgentStatus(AGENT, {
    displayName: "Company Outreach",
    icon: "send",
    status: "running",
    lastRun: new Date().toISOString(),
  });

  if (!store.userProfile.profession) {
    setAgentStatus(AGENT, { status: "needs_config", lastAction: "Profile not configured", configRequired: ["profession"], runCount: (store.agentStatus[AGENT]?.runCount ?? 0) + 1 });
    return;
  }

  // Generate a fresh media kit if profile updated recently
  const profileAge = Date.now() - new Date(store.userProfile.updatedAt).getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (profileAge < oneDay || store.outreachHistory.filter((r) => r.type === "proposal").length === 0) {
    const mediaKit = await generateMediaKit(openai);

    if (mediaKit) {
      addApproval({
        type: "send_proposal",
        title: "Media kit generated and ready",
        description: "Your updated media kit is ready to review and send to potential partners.",
        agent: AGENT,
        draft: mediaKit,
      });
      addLog({ agent: AGENT, action: "Media kit generated", detail: "Professional media kit ready for review", status: "success" });
    }
  }

  // Find top new opportunities and prepare proposals
  const topNew = store.opportunities
    .filter((o) => o.status === "new" && o.score >= 75)
    .slice(0, 2);

  let proposals = 0;
  for (const opp of topNew) {
    const proposal = await generateSponsorshipProposal(openai, opp.company ?? opp.title, opp.type);
    if (proposal) {
      addApproval({
        type: "send_proposal",
        title: `Proposal ready for ${opp.company ?? opp.title}`,
        description: `Outreach Agent prepared a customized sponsorship proposal for "${opp.title}". Est. value: $${opp.estimatedValue || "TBD"}.`,
        agent: AGENT,
        opportunityId: opp.id,
        draft: proposal,
      });
      proposals++;
    }
  }

  const action = `Generated media kit + ${proposals} proposal(s)`;
  addLog({ agent: AGENT, action: "Outreach materials ready", detail: action, status: "success" });

  setAgentStatus(AGENT, {
    status: "success",
    lastAction: action,
    successCount: (store.agentStatus[AGENT]?.successCount ?? 0) + 1,
    runCount: (store.agentStatus[AGENT]?.runCount ?? 0) + 1,
  });
}
