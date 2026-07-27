/**
 * Compliance review demo agent using the AgentPatch TypeScript SDK.
 *
 * Simulates reading a contract, running a retrieval against a policy corpus,
 * classifying risk, and annotating sensitive clauses.
 */

import { AgentPatch } from "../src";

const API_BASE_URL = process.env.AGENTPATCH_API_BASE_URL ?? "http://localhost:8000";
const API_KEY = process.env.AGENTPATCH_API_KEY ?? "change-me-in-production";

async function main(): Promise<void> {
  const client = new AgentPatch({
    baseUrl: API_BASE_URL,
    apiKey: API_KEY,
    workflowName: "compliance-review-agent",
    environment: "demo",
    captureMode: "full",
  });

  const run = (await client.startRun({
    input: { contract_id: "MSA-2026-0042", language: "en-US" },
    metadata: { reviewer: "compliance-bot", channel: "automated" },
  })) as { run_id: string; status: string };

  console.log(`Started compliance-review run: ${run.run_id}`);

  const retrieval = await client.startSpan(run.run_id, {
    span_type: "retrieval",
    name: "retrieve_policy_clauses",
    input_payload: { contract_id: "MSA-2026-0042" },
  });

  await client.recordRetrieval(retrieval.span_id as string, [
    {
      source_name: "policy-v4.2.pdf",
      source_uri: "s3://docs/policy-v4.2.pdf",
      rank: 1,
      score: 0.92,
      content_snippet: "Liability cap is fixed at 12 months of fees.",
    },
    {
      source_name: "policy-v4.1.pdf",
      source_uri: "s3://docs/policy-v4.1.pdf",
      rank: 2,
      score: 0.81,
      content_snippet: "Termination for convenience requires 60 days notice.",
    },
  ]);

  await client.endSpan(retrieval.span_id as string, {
    status: "ok",
    output: { documents: ["policy-v4.2.pdf", "policy-v4.1.pdf"] },
    metrics: { input_tokens: 60, output_tokens: 18, estimated_cost_usd: 0.0015 },
  });

  const classify = await client.startSpan(run.run_id, {
    span_type: "model_call",
    name: "classify_risk",
    input_payload: { contract_id: "MSA-2026-0042" },
  });

  await client.endSpan(classify.span_id as string, {
    status: "ok",
    output: { risk_level: "medium", escalate: false },
    metrics: { input_tokens: 240, output_tokens: 35, estimated_cost_usd: 0.003 },
  });

  await client.recordEvents(run.run_id, [
    {
      type: "annotation",
      payload: {
        label: "needs_review",
        note: "Liability clause references v4.2 — confirm with legal.",
      },
    },
  ]);

  await client.endRun(run.run_id, {
    status: "success",
    output: { risk_level: "medium", escalate: false, summary: "Compliant with current policy." },
  });

  console.log(`Finished compliance-review run: ${run.run_id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
