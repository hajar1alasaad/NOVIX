import { Router } from "express";
import OpenAI from "openai";

const router = Router();

/**
 * Lazily create the OpenAI client per-request so the server can start
 * without OPENAI_API_KEY set (the route will return a 503 instead of
 * crashing the process at import time).
 */
function getOpenAI(): OpenAI {
  if (!process.env["OPENAI_API_KEY"]) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });
}

router.post("/ai/chat", async (req, res) => {
  try {
    const { systemPrompt, userMessage } = req.body as {
      systemPrompt: string;
      userMessage: string;
    };

    if (!userMessage) {
      res.status(400).json({ error: "userMessage is required" });
      return;
    }

    const openai = getOpenAI();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: userMessage });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1024,
    });

    const response = completion.choices[0]?.message?.content ?? "";
    res.json({ response });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    if (msg.includes("OPENAI_API_KEY")) {
      res.status(503).json({ error: "AI features are not configured on this server." });
      return;
    }
    req.log.error({ err }, "AI chat error");
    res.status(500).json({ error: "AI request failed" });
  }
});

router.post("/ai/chat-stream", async (req, res) => {
  try {
    const { systemPrompt, messages: history } = req.body as {
      systemPrompt: string;
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

    const openai = getOpenAI();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    if (history && Array.isArray(history)) {
      for (const m of history) {
        messages.push({ role: m.role, content: m.content });
      }
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 2048,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stream failed";
    if (msg.includes("OPENAI_API_KEY")) {
      res.write(`data: ${JSON.stringify({ error: "AI features are not configured on this server." })}\n\n`);
    } else {
      req.log.error({ err }, "AI stream error");
      res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
    }
    res.end();
  }
});

export default router;
