/**
 * IT incident triage demo agent using the AgentPatch TypeScript SDK.
 *
 * Run with the API running locally:
 *   AGENTPATCH_API_BASE_URL=http://localhost:8000 \
 *     npx tsx packages/sdk-ts/examples/incident_triage_agent.ts
 */

import { AgentPatch } from "../src";

const API_BASE_URL = process.env.AGENTPATCH_API_BASE_URL ?? "http://localhost:8000";
const API_KEY = process.env.AGENTPATCH_API_KEY ?? "change-me-in-production";

const TICKETS = [
  { id: "INC-1041", title: "API latency spike", service: "payments-api", severity: "high" },
  { id: "INC-1042", title: "Nginx 502 on checkout", service: "web", severity: "critical" },
  { id: "INC-1043", title: "Background worker crash", service: "ingest", severity: "medium" },
];

function classify(ticket: { id: string; title: string }) {
  const lower = ticket.title.toLowerCase();
  const matchedRunbook = lower.includes("502")
    ? "runbook-nginx-502"
    : lower.includes("latency")
    ? "runbook-latency"
    : "runbook-worker";
  return { matchedRunbook, answer: `Runbook: ${matchedRunbook}` };
}

async function main(): Promise<void> {
  const ticket = TICKETS[Math.floor(Math.random() * TICKETS.length)] ?? TICKETS[0];
  if (!ticket) return;
  const { matchedRunbook, answer } = classify(ticket);
  const client = new AgentPatch({
    baseUrl: API_BASE_URL,
    apiKey: API_KEY,
    workflowName: "it-incident-triage-agent",
    environment: "demo",
    captureMode: "full",
  });

  const run = (await client.startRun({
    input: { ticket_id: ticket.id, title: ticket.title, service: ticket.service },
    metadata: { severity: ticket.severity, channel: "pagerduty" },
  })) as { run_id: string; status: string };
  console.log(`Started incident-triage run: ${run.run_id} for ${ticket.id}`);

  const classifySpan = await client.startSpan(run.run_id, {
    span_type: "model_call",
    name: "classify_incident",
    input_payload: { ticket },
  });

  const toolSpan = await client.startSpan(run.run_id, {
    span_type: "tool_call",
    name: "lookup_runbook",
    input_payload: { ticket_id: ticket.id },
    parent_span_id: classifySpan.span_id as string,
  });

  await client.endSpan(classifySpan.span_id as string, {
    status: "ok",
    output: { answer, matched_runbook: matchedRunbook },
    metrics: { input_tokens: 220, output_tokens: 60, estimated_cost_usd: 0.004 },
  });

  await client.endSpan(toolSpan.span_id as string, {
    status: "ok",
    output: { matched_runbook },
    metrics: { input_tokens: 30, output_tokens: 12, estimated_cost_usd: 0.001 },
  });

  await client.endRun(run.run_id, {
    status: "success",
    output: { answer, ticket_id: ticket.id, matched_runbook: matchedRunbook },
  });

  console.log(`Finished incident-triage run: ${run.run_id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
