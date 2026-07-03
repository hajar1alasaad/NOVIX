import { useState } from "react";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (
    systemPrompt: string,
    userMessage: string
  ): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, userMessage }),
      });
      if (!res.ok) throw new Error("AI request failed");
      const data = await res.json();
      return data.response as string;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const generateEmailReply = async (
    emailContext: string,
    instruction?: string
  ) => {
    const system = `You are NOVIX, an elite AI business manager. You write concise, professional, high-converting email replies on behalf of busy executives. Your tone is confident, warm, and action-oriented. Never use generic phrases. Sign off with "Best regards" followed by a blank line. Keep it under 150 words unless detail is essential.`;
    const user = instruction
      ? `Write a reply to this email. Instruction: ${instruction}\n\nEmail:\n${emailContext}`
      : `Write the best possible reply to this email:\n\n${emailContext}`;
    return ask(system, user);
  };

  const analyzeDeal = async (dealInfo: string) => {
    const system = `You are NOVIX, an elite AI business manager with deep expertise in B2B sales strategy, negotiation, and deal analysis. Provide concise, actionable insights. Be direct and specific.`;
    const user = `Analyze this deal and give 3 specific recommendations to close it:\n\n${dealInfo}`;
    return ask(system, user);
  };

  const generateTaskList = async (context: string) => {
    const system = `You are NOVIX, an autonomous AI business manager. Generate a prioritized, actionable task list. Format as a JSON array of objects with: title, priority (high/medium/low), description. Max 5 tasks. Respond with ONLY valid JSON.`;
    const user = `Based on this context, generate the most important tasks:\n\n${context}`;
    const response = await ask(system, user);
    try {
      return JSON.parse(response);
    } catch {
      return [];
    }
  };

  const summarizeMeeting = async (notes: string) => {
    const system = `You are NOVIX, an elite AI business manager. Create a clear, structured meeting summary with: Key Decisions, Action Items, and Next Steps. Be concise and actionable.`;
    const user = `Summarize this meeting:\n\n${notes}`;
    return ask(system, user);
  };

  const getBusinessInsight = async (context: string) => {
    const system = `You are NOVIX, an elite AI business advisor with expertise in strategy, revenue growth, and operational efficiency. Give one powerful, specific business insight based on the data provided. Be direct and actionable. Max 3 sentences.`;
    const user = context;
    return ask(system, user);
  };

  return {
    loading,
    error,
    ask,
    generateEmailReply,
    analyzeDeal,
    generateTaskList,
    summarizeMeeting,
    getBusinessInsight,
  };
}
