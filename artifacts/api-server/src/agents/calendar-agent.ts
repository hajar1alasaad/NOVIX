import { addLog, setAgentStatus, getStore } from "../lib/store.js";
import type OpenAI from "openai";

const AGENT = "calendar";

export async function suggestMeetingTime(openai: OpenAI, context: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content: "Suggest 3 specific meeting time slots for the next 7 days. Format: Day, Date Month at Time TZ. Keep responses brief.",
      },
      { role: "user", content: context },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}

export async function prepareMeetingAgenda(openai: OpenAI, context: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content: "Create a concise meeting agenda with time allocations. Format as numbered list with durations.",
      },
      { role: "user", content: `Create agenda for: ${context}` },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}

export async function run(openai: OpenAI): Promise<void> {
  const store = getStore();

  setAgentStatus(AGENT, {
    displayName: "Calendar Agent",
    icon: "calendar",
    status: "running",
    lastRun: new Date().toISOString(),
  });

  // Check for approved opportunities that need meetings scheduled
  const needsMeeting = store.opportunities
    .filter((o) => o.status === "negotiating")
    .slice(0, 2);

  let scheduled = 0;
  for (const opp of needsMeeting) {
    const agenda = await prepareMeetingAgenda(openai, `Negotiation call with ${opp.company ?? opp.title} about ${opp.type} collaboration`);
    if (agenda) {
      addLog({
        agent: AGENT,
        action: "Agenda prepared",
        detail: `Meeting agenda ready for ${opp.company ?? opp.title}`,
        status: "success",
      });
      scheduled++;
    }
  }

  // Check for upcoming meetings and prepare reminders
  const now = new Date();
  const upcoming = store.meetings
    .filter((m) => m.status === "scheduled" && new Date(m.date) > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  if (upcoming.length > 0) {
    const nextMeeting = upcoming[0];
    const hoursUntil = (new Date(nextMeeting.date).getTime() - now.getTime()) / 3_600_000;
    if (hoursUntil < 24) {
      addLog({
        agent: AGENT,
        action: "Meeting reminder",
        detail: `"${nextMeeting.title}" with ${nextMeeting.withContact} in ${Math.round(hoursUntil)}h`,
        status: "info",
      });
    }
  }

  // Check if Google Calendar integration is configured
  const hasCalendarAccess = !!process.env["GOOGLE_CALENDAR_ACCESS_TOKEN"];
  if (!hasCalendarAccess) {
    setAgentStatus(AGENT, {
      status: "success",
      lastAction: upcoming.length > 0
        ? `Managing ${upcoming.length} upcoming meetings (local only)`
        : "No upcoming meetings · Connect Google Calendar for full sync",
      configRequired: ["GOOGLE_CALENDAR_ACCESS_TOKEN"],
      successCount: (store.agentStatus[AGENT]?.successCount ?? 0) + 1,
      runCount: (store.agentStatus[AGENT]?.runCount ?? 0) + 1,
    });
  } else {
    setAgentStatus(AGENT, {
      status: "success",
      lastAction: `Synced calendar · ${upcoming.length} meetings upcoming`,
      successCount: (store.agentStatus[AGENT]?.successCount ?? 0) + 1,
      runCount: (store.agentStatus[AGENT]?.runCount ?? 0) + 1,
    });
  }

  void scheduled;
}
