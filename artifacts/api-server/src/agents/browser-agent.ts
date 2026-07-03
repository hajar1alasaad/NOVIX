import * as cheerio from "cheerio";
import { addLog, setAgentStatus, getStore } from "../lib/store.js";
import type OpenAI from "openai";

const AGENT = "browser";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; NOVIXBot/1.0; +https://novix.ai/bot)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

export interface PageResult {
  url: string;
  title: string;
  description: string;
  text: string;
  links: string[];
  success: boolean;
  error?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function fetchWithTimeout(url: string, ms = 10_000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { headers: HEADERS, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPage(url: string): Promise<PageResult> {
  try {
    const res = await fetchWithTimeout(url, 12_000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    $("script, style, nav, footer, header, aside, .ad, .ads, #cookie").remove();

    const title = $("title").text().trim() || $("h1").first().text().trim();
    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "";

    const bodyText = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);

    const links: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      if (href.startsWith("http") && links.length < 20) links.push(href);
    });

    return { url, title, description, text: bodyText, links, success: true };
  } catch (err) {
    return { url, title: "", description: "", text: "", links: [], success: false, error: String(err) };
  }
}

export async function searchWeb(query: string): Promise<SearchResult[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encoded}&kl=us-en`;
  const results: SearchResult[] = [];

  try {
    const res = await fetchWithTimeout(url, 12_000);
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);

    $(".result").each((_, el) => {
      if (results.length >= 10) return;
      const title = $(el).find(".result__title").text().trim();
      const href = $(el).find(".result__url").text().trim();
      const snippet = $(el).find(".result__snippet").text().trim();
      if (title && snippet) {
        results.push({ title, url: href.startsWith("http") ? href : `https://${href}`, snippet });
      }
    });
  } catch { /* network blocked or unavailable */ }

  return results;
}

export async function extractInsights(
  openai: OpenAI,
  pageText: string,
  goal: string
): Promise<string> {
  if (!pageText.trim()) return "";
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 512,
    messages: [
      { role: "system", content: "You are a web content analyst. Extract only relevant information concisely." },
      { role: "user", content: `Goal: ${goal}\n\nPage content:\n${pageText.slice(0, 3000)}\n\nExtract relevant information:` },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}

export async function run(openai: OpenAI): Promise<void> {
  const store = getStore();
  setAgentStatus(AGENT, {
    displayName: "Browser Agent",
    icon: "globe",
    status: "running",
    lastRun: new Date().toISOString(),
  });

  // Validate top unvisited opportunity URLs
  const unvisited = store.opportunities.filter((o) => o.url && o.status === "new").slice(0, 3);

  let visited = 0;
  for (const opp of unvisited) {
    const page = await fetchPage(opp.url);
    if (page.success && page.text.length > 100) {
      const insights = await extractInsights(openai, page.text, `Find details about: ${opp.title}`);
      if (insights) {
        addLog({ agent: AGENT, action: "Page validated", detail: `${opp.title} — ${opp.url}`, status: "success" });
        visited++;
      }
    }
  }

  setAgentStatus(AGENT, {
    status: "success",
    lastAction: visited > 0 ? `Validated ${visited} opportunity pages` : "No new pages to validate",
    successCount: (store.agentStatus[AGENT]?.successCount ?? 0) + 1,
    runCount: (store.agentStatus[AGENT]?.runCount ?? 0) + 1,
  });
}
