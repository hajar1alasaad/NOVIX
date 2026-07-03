import { addLog, addInvoice, setAgentStatus, getStore } from "../lib/store.js";
import type OpenAI from "openai";

const AGENT = "finance";

export async function generateInvoice(
  client: string,
  amount: number,
  description: string,
  dueInDays = 14
): Promise<string> {
  const store = getStore();
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(store.invoices.length + 1).padStart(4, "0")}`;
  const dueDate = new Date(Date.now() + dueInDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;

  const inv = addInvoice({
    number: invoiceNumber,
    client,
    amount,
    currency: "USD",
    status: "draft",
    description,
    dueDate,
  });

  addLog({ agent: AGENT, action: "Invoice created", detail: `${inv.number} · ${client} · $${amount}`, status: "success" });
  return inv.id;
}

export async function generateFinancialReport(openai: OpenAI): Promise<string> {
  const store = getStore();
  const invoices = store.invoices;

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter((i) => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + i.amount, 0);
  const wonValue = store.opportunities.filter((o) => o.status === "won").reduce((s, o) => s + (o.estimatedValue ?? 0), 0);
  const pipelineValue = store.opportunities
    .filter((o) => ["approved", "contacted", "negotiating"].includes(o.status))
    .reduce((s, o) => s + (o.estimatedValue ?? 0), 0);

  const context = `Invoices: ${invoices.length} total | $${totalInvoiced} invoiced | $${totalPaid} paid | $${outstanding} outstanding | Won deals: $${wonValue} | Pipeline: $${pipelineValue}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 300,
    messages: [
      { role: "system", content: "You are a financial advisor. Give a concise 2-sentence financial health assessment with one key action item." },
      { role: "user", content: `Financial summary: ${context}` },
    ],
  });

  return completion.choices[0]?.message?.content ?? context;
}

export async function run(openai: OpenAI): Promise<void> {
  const store = getStore();

  setAgentStatus(AGENT, {
    displayName: "Finance Agent",
    icon: "dollar-sign",
    status: "running",
    lastRun: new Date().toISOString(),
  });

  // Check for overdue invoices
  const now = new Date();
  const overdueInvoices = store.invoices.filter(
    (inv) => inv.status === "sent" && new Date(inv.dueDate) < now
  );

  for (const inv of overdueInvoices) {
    addLog({
      agent: AGENT,
      action: "Overdue invoice detected",
      detail: `${inv.number} · ${inv.client} · $${inv.amount} — due ${inv.dueDate}`,
      status: "error",
    });
  }

  // Generate financial summary
  const report = await generateFinancialReport(openai);
  addLog({ agent: AGENT, action: "Financial report", detail: report.slice(0, 200), status: "info" });

  const totalPaid = store.invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = store.invoices.filter((i) => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + i.amount, 0);
  const pipelineValue = store.opportunities
    .filter((o) => ["approved", "contacted", "negotiating"].includes(o.status))
    .reduce((s, o) => s + (o.estimatedValue ?? 0), 0);

  const action = `$${totalPaid.toLocaleString()} collected · $${outstanding.toLocaleString()} outstanding · $${pipelineValue.toLocaleString()} pipeline`;

  setAgentStatus(AGENT, {
    status: overdueInvoices.length > 0 ? "error" : "success",
    lastAction: action,
    successCount: (store.agentStatus[AGENT]?.successCount ?? 0) + 1,
    runCount: (store.agentStatus[AGENT]?.runCount ?? 0) + 1,
  });
}
