import { addLog, addMemory, setAgentStatus, getStore } from "../lib/store.js";
import type OpenAI from "openai";

const AGENT = "memory";

export async function storeContextualMemory(
  openai: OpenAI,
  context: string,
  source: string
): Promise<void> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 512,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Extract key facts worth remembering from the context. Return JSON:
{"facts": [{"key": "short_key", "value": "the fact", "category": "client|brand|preference|rule|career|general"}]}`,
      },
      { role: "user", content: context },
    ],
  });

  try {
    const data = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as {
      facts?: { key: string; value: string; category: "client" | "brand" | "preference" | "rule" | "career" | "general" }[];
    };
    for (const fact of data.facts ?? []) {
      addMemory({ key: fact.key, value: fact.value, category: fact.category, source });
    }
  } catch { /* ignore parse errors */ }
}

export async function recall(openai: OpenAI, query: string): Promise<string> {
  const store = getStore();
  if (!store.memory.length) return "No memories stored yet.";

  const memoryStr = store.memory
    .slice(0, 50)
    .map((m) => `[${m.category}] ${m.key}: ${m.value}`)
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 256,
    messages: [
      {
        role: "system",
        content: "You are a memory retrieval system. Answer the query using only the stored memories below.",
      },
      { role: "user", content: `Memories:\n${memoryStr}\n\nQuery: ${query}` },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}

export async function run(openai: OpenAI): Promise<void> {
  const store = getStore();

  setAgentStatus(AGENT, {
    displayName: "Memory Agent",
    icon: "database",
    status: "running",
    lastRun: new Date().toISOString(),
  });

  // Consolidate and deduplicate memories
  if (store.memory.length > 10) {
    const memStr = store.memory.map((m) => `${m.key}: ${m.value}`).join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 512,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Consolidate and deduplicate these memories. Merge similar entries. Return JSON:
{"consolidated": [{"key": "string", "value": "string", "category": "client|brand|preference|rule|career|general"}]}`,
        },
        { role: "user", content: memStr },
      ],
    });

    try {
      const data = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as {
        consolidated?: { key: string; value: string; category: "client" | "brand" | "preference" | "rule" | "career" | "general" }[];
      };
      if ((data.consolidated?.length ?? 0) > 0) {
        for (const m of data.consolidated!) {
          addMemory({ key: m.key, value: m.value, category: m.category, source: "memory-consolidation" });
        }
        addLog({ agent: AGENT, action: "Memory consolidated", detail: `${data.consolidated!.length} entries consolidated`, status: "success" });
      }
    } catch { /* ignore */ }
  }

  const count = store.memory.length;
  setAgentStatus(AGENT, {
    status: "success",
    lastAction: `Managing ${count} memory entries`,
    successCount: (store.agentStatus[AGENT]?.successCount ?? 0) + 1,
    runCount: (store.agentStatus[AGENT]?.runCount ?? 0) + 1,
  });

  addLog({ agent: AGENT, action: "Memory scan complete", detail: `${count} entries in long-term memory`, status: "info" });
}
