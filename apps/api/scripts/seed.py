"""Seed AgentPatch Studio with realistic 2026 Q3 demo traces.

Refreshed from the original support-policy-only seed to reflect the
almost-finished state of the app: three workflows (support-policy-agent,
it-incident-triage-agent, compliance-review-agent), modern LLM stack
(Claude Sonnet 4.6, Kimi K2.7 Code, GPT-5, Gemini 2.5 Pro), 2026-era
incidents / contracts / policy versions, 4-6 spans per run instead of
two, and an enrichment phase that pre-populates Run.summary,
failure_explanation, patch_suggestion, suggested_failure_type, plus
EvalCase + EvalResult rows (with patch history so the Eval Lab trend
chart has a story to tell) and AuditLog entries.

The seed flow exercises:

- support-policy-agent      (Document QA + Summarization + Classification)
- it-incident-triage-agent  (Visual QA, Text Ranking, Document QA)
- compliance-review-agent   (Translation, Document QA, Sentence Similarity)

WARNING: This script drops and recreates all database tables. Only run it
against a development/demo database.
"""

import os
import random
import sys
from datetime import timedelta
from itertools import cycle

# Hard guard: refuse to run against a production database by default. The
# script does Base.metadata.drop_all + create_all on entry, so accidentally
# running it against a real prod DB would erase all tables.
#
# Opt-in for the public demo deploy: set BOTH
#   AGENTPATCH_ENV=production
#   AGENTPATCH_ALLOW_SEED_IN_PRODUCTION=1
# and (idempotently) AGENTPATCH_DROP_TABLES=0. The Docker entrypoint
# (apps/api/start.sh) does exactly this — it only seeds when the runs
# table is empty, and never drops existing tables in production.
if (
    os.getenv("AGENTPATCH_ENV") == "production"
    and os.getenv("AGENTPATCH_ALLOW_SEED_IN_PRODUCTION") != "1"
):
    sys.exit(
        "refusing to seed: AGENTPATCH_ENV=production without "
        "AGENTPATCH_ALLOW_SEED_IN_PRODUCTION=1"
    )

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv

load_dotenv()

os.environ.setdefault("AGENTPATCH_API_KEY", "demo-key")
os.environ.setdefault("LLM_PROVIDER", "mock")

from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, SessionLocal, engine, utc_now  # noqa: E402
from app.main import app  # noqa: E402
from app.models import AuditLog, EvalResult, Project, Run  # noqa: E402

client = TestClient(app)

HEADERS = {
    "Authorization": f"Bearer {os.environ['AGENTPATCH_API_KEY']}",
    "Content-Type": "application/json",
}

# Used to validate the AGENTPATCH_API_KEY environment is set.
assert HEADERS["Authorization"] != "Bearer ", "AGENTPATCH_API_KEY must be set"


# ---------------------------------------------------------------------------
# Modern LLM/config profiles — cycled across runs so the analytics charts
# surface velocity, model-mix, and prompt-version trends.
# ---------------------------------------------------------------------------
MODEL_PROFILES = [
    {"model_name": "Claude Sonnet 4.6", "prompt_version": "v8.3.0", "framework": "langgraph", "temperature": 0.1},
    {"model_name": "Kimi K2.7 Code", "prompt_version": "v9.0.0", "framework": "crewai", "temperature": 0.4},
    {"model_name": "GPT-5", "prompt_version": "v12.0.0", "framework": "openai-agents", "temperature": 0.2},
    {"model_name": "Gemini 2.5 Pro", "prompt_version": "v12.0.0", "framework": "langgraph", "temperature": 0.0},
]

# Spread started_at across the last ~30 days from 2026-07-27 with a
# deterministic random shuffle for realistic time-series charts.
DAY_OFFSETS = [0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
               14, 15, 17, 19, 21, 23, 25, 27, 29, 0, 1, 3, 6, 11, 14, 21]


# Span name pools — each scenario weaves 4-6 of these in dependency order.
# Naming them as distinct span_types instead of just "model_call" gives the
# analytics charts different names to aggregate.
SUPPORT_SPANS = [
    "route_intent",
    "classify_topic",
    "retrieve_policy_docs",
    "rank_documents",
    "validate_grounding",
    "generate_answer",
    "verify_output",
    "format_response",
]
INCIDENT_SPANS = [
    "classify_severity",
    "retrieve_postmortems",
    "lookup_runbook",
    "match_similar_incidents",
    "generate_triage_report",
    "notify_oncall",
]
COMPLIANCE_SPANS = [
    "parse_document",
    "detect_language",
    "translate_clauses",
    "retrieve_policy_clauses",
    "classify_risk",
    "generate_summary",
    "flag_escalation",
]

# Counterparties used across both support (account records) and compliance
# (contract review) workflows. Modern, plausibly distinct industries.
COUNTERPARTIES = [
    {"org": "Globex Manufacturing",     "doc_id": "MSA-2026-0100", "type": "MSA", "language": "en-US", "tier": "enterprise"},
    {"org": "Initech SaaS",             "doc_id": "DPA-2026-0211", "type": "DPA", "language": "en-US", "tier": "pro"},
    {"org": "Cyberdyne Fintech",        "doc_id": "NDA-2026-0305", "type": "NDA", "language": "en-US", "tier": "enterprise"},
    {"org": "Umbrella Corp Healthcare", "doc_id": "BAA-2026-0499", "type": "BAA", "language": "en-US", "tier": "enterprise"},
    {"org": "Soylent Biotech",          "doc_id": "MSA-2026-0501", "type": "MSA", "language": "en-US", "tier": "pro"},
    {"org": "Wayne Enterprises",        "doc_id": "DPA-2026-0612", "type": "DPA", "language": "en-US", "tier": "enterprise"},
    {"org": "Aperture Science",         "doc_id": "NDA-2026-0718", "type": "NDA", "language": "en-US", "tier": "pro"},
    {"org": "Tyrell Corporation",       "doc_id": "MSA-2026-0820", "type": "MSA", "language": "es-ES", "tier": "enterprise"},
]

# Modern 2026 incident catalog, all post-Q2.
INCIDENT_TICKETS = [
    {"id": "INC-2041", "title": "API gateway 504s on auth endpoints",    "service": "auth-gateway",   "severity": "critical"},
    {"id": "INC-2042", "title": "Database replication lag in us-east-3","service": "primary-db",     "severity": "high"},
    {"id": "INC-2043", "title": "Redis eviction rate spike",             "service": "cache-cluster",  "severity": "medium"},
    {"id": "INC-2044", "title": "Webhook delivery failure for Stripe",  "service": "billing-webhooks", "severity": "high"},
    {"id": "INC-2045", "title": "High memory on ingestion workers",     "service": "ingest-worker",  "severity": "medium"},
]


# ---------------------------------------------------------------------------
# Failure-type → pre-analyzed fields. Lets the run detail page render the
# "Suggested root cause + Failure explanation + Patch suggestion" cards
# without the user having to click Analyze first.
# ---------------------------------------------------------------------------
ANALYSIS_MAP = {
    "stale_source": {
        "suggested_failure_type": "stale_source",
        "failure_explanation": "Agent retrieved deprecated 2024 policy documents instead of the current 2026 active policies.",
        "patch_suggestion": "Pin retrieval to policy-v6.1.pdf and drop v4/v5 indices from the vector store rotation cycle.",
    },
    "wrong_tool": {
        "suggested_failure_type": "wrong_tool",
        "failure_explanation": "The orchestrator selected an irrelevant tool for the user's intent (e.g. search_kb vs fetch_billing_portal).",
        "patch_suggestion": "Update the search_kb tool description to explicitly exclude billing/account lookups and add a pre-routing intent check.",
    },
    "wrong_tool_args": {
        "suggested_failure_type": "wrong_tool_args",
        "failure_explanation": "The model emitted a string parameter where the tool schema required an integer (or other typed shape).",
        "patch_suggestion": "Enable strict JSON-schema validation (response_format: json_schema) on all tool-calling spans.",
    },
    "hallucination": {
        "suggested_failure_type": "hallucination",
        "failure_explanation": "Agent invented a specific remedy, value, or numerical claim that is not present in the retrieved context.",
        "patch_suggestion": "Add an explicit 'if not grounded, say I don't know' guardrail and lower the validate_grounding threshold to 0.85.",
    },
    "formatting": {
        "suggested_failure_type": "formatting",
        "failure_explanation": "The output parser encountered malformed JSON due to leftover markdown fences or unwrapped code blocks.",
        "patch_suggestion": "Force response_format=json_object on the generate_answer span and add a post-processing stripper in format_response.",
    },
    "timeout": {
        "suggested_failure_type": "timeout",
        "failure_explanation": "Model generation exceeded the upstream gateway's 30-second timeout.",
        "patch_suggestion": "Raise upstream gateway timeout to 60s for OCR / long-context spans and add a streaming retry.",
    },
    "missing_escalation": {
        "suggested_failure_type": "missing_escalation",
        "failure_explanation": "A high-risk PII / compliance input was auto-resolved without routing to a human reviewer.",
        "patch_suggestion": "Implement a mandatory human-in-the-loop step for inputs containing 'breach', 'PII', or 'uncapped liability'.",
    },
    "policy_refusal": {
        "suggested_failure_type": "policy_refusal",
        "failure_explanation": "The model correctly triggered a safety refusal based on a prompt-injection pattern.",
        "patch_suggestion": "No code patch required; this is the desired behavior. Route to a generic recovery page.",
    },
}


# ===========================================================================
# Scenario definitions.
# ===========================================================================

SUPPORT_SUCCESS_QUERIES = [
    "Reset 2FA on my enterprise account",
    "Add Wayne Enterprises to my workspace",
    "Upload Q3 2026 invoice for Aperture",
    "What is the uptime SLA for the Platinum tier?",
    "Can I downgrade my annual plan midterm?",
]

SUPPORT_FAILURES = [
    {
        "name": "stale_source",
        "query": "Can I get a refund for my annual plan?",
        "answer": "Annual plans are non-refundable.",
        "stale_doc": "refund-policy-2024.pdf",
        "current_doc": "refund-policy-2026.pdf",
        "note": "Retrieved deprecated refund-policy-2024.pdf instead of refund-policy-2026.pdf.",
    },
    {
        "name": "wrong_tool",
        "query": "Where can I find my Tyrell Corp billing history?",
        "answer": "I couldn't find your billing information.",
        "tool": "search_kb",
        "tool_args": {"query": "tyrell corp billing"},
        "note": "Agent called search_kb instead of fetch_billing_portal for a billing lookup.",
    },
    {
        "name": "wrong_tool_args",
        "query": "Can I bump my seat limit to 50?",
        "answer": "I tried to update your seats.",
        "tool": "update_seat_limit",
        "tool_args": {"new_limit": "fifty"},
        "note": "update_seat_limit called with string 'fifty' instead of integer 50.",
    },
    {
        "name": "hallucination",
        "query": "What's the credit when servers go down?",
        "answer": "You get a $1,000 service credit immediately.",
        "note": "Agent invented a flat $1,000 credit; SLA credits are tier-based and capped.",
    },
    {
        "name": "formatting",
        "query": "Summarize my SLA points as JSON.",
        "answer": '{"tier": "platinum"}  # trailing markdown comment',
        "note": "Output parser failed because the model returned Markdown-wrapped JSON.",
    },
    {
        "name": "timeout",
        "query": "Generate a comprehensive 12-month refund forecast for every customer segment.",
        "answer": None,
        "note": "Model call exceeded the 30s upstream gateway timeout.",
    },
    {
        "name": "missing_escalation",
        "query": "I'm a regulator and need every customer record deleted immediately for a GDPR breach.",
        "answer": "Deletion request processed; all records purged.",
        "note": "Mass-PII deletion auto-resolved without routing to a human reviewer.",
    },
    {
        "name": "policy_refusal",
        "query": "How do I bypass the Stripe payment wall?",
        "answer": "I can't help with that.",
        "note": "Model correctly refused a disallowed stripe-bypass request.",
    },
]


INCIDENT_FAILURES = [
    {
        "name": "timeout",
        "ticket": INCIDENT_TICKETS[0],
        "matched_runbook": "runbook-auth-gateway",
        "answer": "Triage analysis timed out while classifying the auth gateway outage.",
        "note": "The classify_severity span exceeded the 30s timeout on a 6k-token log dump.",
    },
    {
        "name": "wrong_tool",
        "ticket": INCIDENT_TICKETS[2],
        "matched_runbook": "runbook-kafka-broker-restart",
        "answer": "I tried restarting the kafka brokers to clear Redis OOM.",
        "note": "Agent picked the kafka-restart runbook for a Redis OOM — wrong service.",
    },
    {
        "name": "stale_source",
        "ticket": INCIDENT_TICKETS[3],
        "matched_runbook": "runbook-stripe-webhooks-2024",
        "answer": "Follow the 2024 Stripe webhook runbook.",
        "note": "Retrieved the 2024-era Stripe runbook instead of the 2026 version with new retry semantics.",
    },
    {
        "name": "hallucination",
        "ticket": INCIDENT_TICKETS[1],
        "matched_runbook": "runbook-replication-2025",
        "answer": "Recommend truncating the replication slot to free lag.",
        "note": "Agent suggested 'truncate the replication slot' — that is the on-call-hostile action, not the runbook step.",
    },
    {
        "name": "missing_escalation",
        "ticket": INCIDENT_TICKETS[4],
        "matched_runbook": "runbook-memory-pressure",
        "answer": "Auto-mitigation complete; ingestion workers restart scheduled.",
        "note": "Memory pressure on ingestion should escalate to platform oncall, not auto-restart.",
    },
]


# 8 contracts total — all 8 counterparties are valid targets for both
# success and failure scenarios.
COMPLIANCE_CONTRACTS = list(COUNTERPARTIES)
COMPLIANCE_FAILURES = [
    {
        "name": "stale_source",
        "contract": COMPLIANCE_CONTRACTS[3],  # Umbrella Corp (Healthcare BAA)
        "matched_policy": "policy-v5.0.pdf",
        "current_policy": "policy-v6.1.pdf",
        "risk": "high",
        "answer": "Liability cap is uncapped.",
        "note": "Agent used deprecated v5.0 policy; current BAA policy is v6.1 which caps liability at 12 months of fees.",
    },
    {
        "name": "policy_refusal",
        "contract": COMPLIANCE_CONTRACTS[7],  # Tyrell MSA Spanish
        "matched_policy": "policy-v6.1.pdf",
        "risk": "low",
        "answer": "Unable to evaluate Spanish-language contract.",
        "note": "Model refused a Spanish-language contract even though translate_clauses is supported.",
    },
    {
        "name": "wrong_tool_args",
        "contract": COMPLIANCE_CONTRACTS[7],
        "matched_policy": "policy-v6.1.pdf",
        "risk": "medium",
        "answer": "Translation failed for the liability section.",
        "tool": "translate_clauses",
        "tool_args": {"lang": "ESP"},
        "note": "translate_clauses was called with lang=ESP instead of BCP-47 es-ES.",
    },
    {
        "name": "missing_escalation",
        "contract": COMPLIANCE_CONTRACTS[2],  # Cyberdyne Fintech NDA
        "matched_policy": "policy-v6.1.pdf",
        "risk": "critical",
        "answer": "Contract is compliant; auto-approved.",
        "note": "High-risk NDA with uncapped liability auto-approved without legal-team routing.",
    },
    {
        "name": "timeout",
        "contract": COMPLIANCE_CONTRACTS[0],  # Globex MSA
        "matched_policy": "policy-v6.1.pdf",
        "risk": "low",
        "answer": None,
        "note": "parse_document span timed out on a 150-page MSA.",
    },
]


# ===========================================================================
# HTTP helpers (run/span/retrieval/artifact/annotation).
# ===========================================================================

def _start_run(user_query: str, workflow: str = "support-policy-agent", days_ago: int = 0):
    # Postgres INTEGER caps ms at 2,147,483,647 (~24.86 days). Cap the
    # elapsed delta so duration_ms never overflows.
    safe_ago = timedelta(
        days=min(days_ago, 21),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )
    max_ago = timedelta(days=23, hours=23, minutes=59)
    started_at = utc_now() - min(safe_ago, max_ago)
    payload = {
        "workflow_name": workflow,
        "environment": "demo",
        "input": {"user_query": user_query},
        "started_at": started_at.isoformat(),
    }
    response = client.post("/api/v1/runs/start", json=payload, headers=HEADERS)
    response.raise_for_status()
    return response.json()["run_id"], started_at


def _start_span(
    run_id: str,
    span_type: str,
    name: str,
    input_payload: dict | None = None,
    parent_span_id: str | None = None,
    model_name: str | None = None,
    tool_name: str | None = None,
    prompt_version: str | None = None,
    temperature: float | None = None,
):
    body = {
        "run_id": run_id,
        "span_type": span_type,
        "name": name,
        "input_payload": input_payload or {},
        "parent_span_id": parent_span_id,
    }
    if model_name:
        body["model_name"] = model_name
    if tool_name:
        body["tool_name"] = tool_name
    if prompt_version:
        body["prompt_version"] = prompt_version
    if temperature is not None:
        body["temperature"] = temperature
    response = client.post("/api/v1/spans", json=body, headers=HEADERS)
    response.raise_for_status()
    return response.json()["span_id"]


def _end_span(span_id: str, output: dict, status: str = "ok", metrics: dict | None = None):
    default = {"input_tokens": 180, "output_tokens": 60, "estimated_cost_usd": 0.003}
    response = client.post(
        f"/api/v1/spans/{span_id}/end",
        json={"status": status, "output_payload": output, "metrics": metrics or default},
        headers=HEADERS,
    )
    response.raise_for_status()


def _record_retrieval(span_id: str, documents: list[dict]):
    response = client.post(
        "/api/v1/retrievals", json={"span_id": span_id, "documents": documents}, headers=HEADERS
    )
    response.raise_for_status()


def _record_artifact(run_id: str, span_id: str | None, artifact_type: str, filename: str, storage_url: str):
    response = client.post(
        "/api/v1/artifacts",
        json={
            "run_id": run_id,
            "span_id": span_id,
            "artifact_type": artifact_type,
            "mime_type": "application/pdf",
            "filename": filename,
            "storage_url": storage_url,
        },
        headers=HEADERS,
    )
    response.raise_for_status()


def _record_annotation(run_id: str, span_id: str | None, label: str, note: str):
    response = client.post(
        "/api/v1/annotations",
        json={"run_id": run_id, "span_id": span_id, "label": label, "note": note},
        headers=HEADERS,
    )
    response.raise_for_status()


def _end_run(
    run_id: str,
    status: str,
    output: dict,
    failure_type: str | None = None,
    requires_review: bool = False,
    severity: str | None = None,
):
    response = client.post(
        f"/api/v1/runs/{run_id}/end",
        json={
            "status": status,
            "output": output,
            "failure_type": failure_type,
            "severity": severity or ("high" if status == "failure" else "low"),
            "requires_review": requires_review,
        },
        headers=HEADERS,
    )
    response.raise_for_status()


# ===========================================================================
# Span chain helpers — build 4-6-span dependency chains per run so the
# analytics dashboards have rich, varied span names.
# ===========================================================================

def _emit_support_success_chain(run_id: str, profile: dict, query: str, current_doc: str = "refund-policy-2026.pdf") -> str:
    """Emit the full happy-path span chain for a support-policy run."""
    # 1. route_intent
    s_route = _start_span(
        run_id, "model_call", "route_intent",
        {"query": query},
        model_name=profile["model_name"], prompt_version=profile["prompt_version"],
        temperature=profile["temperature"],
    )
    _end_span(s_route, {"intent": "account_billing", "confidence": 0.94},
              metrics={"input_tokens": 92, "output_tokens": 14, "estimated_cost_usd": 0.0012})

    # 2. classify_topic
    s_class = _start_span(
        run_id, "model_call", "classify_topic",
        {"intent": "account_billing"},
        parent_span_id=s_route,
        model_name=profile["model_name"], prompt_version=profile["prompt_version"],
        temperature=0.0,
    )
    _end_span(s_class, {"topic": "refund_policy", "score": 0.91},
              metrics={"input_tokens": 134, "output_tokens": 22, "estimated_cost_usd": 0.0016})

    # 3. retrieve
    s_ret = _start_span(
        run_id, "retrieval", "retrieve_policy_docs",
        {"query": query, "topic": "refund_policy"},
        parent_span_id=s_class,
    )
    _record_retrieval(s_ret, [{
        "source_name": current_doc,
        "source_uri": f"s3://docs/{current_doc}",
        "rank": 1, "score": 0.94,
        "content_snippet": "Annual plans are refundable within 30 days of purchase.",
    }])
    _end_span(s_ret, {"documents": [current_doc]},
              metrics={"input_tokens": 80, "output_tokens": 20, "estimated_cost_usd": 0.0011})

    # 4. validate_grounding
    s_ground = _start_span(
        run_id, "guardrail", "validate_grounding",
        {"documents": [current_doc]},
        parent_span_id=s_class,
        model_name=profile["model_name"], prompt_version=profile["prompt_version"],
    )
    _end_span(s_ground, {"grounded": True, "verified_score": 0.97},
              metrics={"input_tokens": 210, "output_tokens": 18, "estimated_cost_usd": 0.0024})

    # 5. generate_answer
    s_answer = _start_span(
        run_id, "model_call", "generate_answer",
        {"prompt": f"Answer: {query}"},
        parent_span_id=s_ground,
        model_name=profile["model_name"], prompt_version=profile["prompt_version"],
        temperature=profile["temperature"],
    )
    _end_span(s_answer, {"answer": f"Yes — here's the current 2026 policy: {current_doc.replace('.pdf', '')} applies."},
              metrics={"input_tokens": 156, "output_tokens": 88, "estimated_cost_usd": 0.0026})
    return s_ret


def _emit_incident_success_chain(run_id: str, profile: dict, ticket: dict) -> str:
    s_class = _start_span(
        run_id, "model_call", "classify_severity",
        {"ticket": ticket},
        model_name=profile["model_name"], prompt_version=profile["prompt_version"],
        temperature=0.0,
    )
    _end_span(s_class, {"severity": ticket["severity"], "confidence": 0.96},
              metrics={"input_tokens": 220, "output_tokens": 28, "estimated_cost_usd": 0.0024})

    s_post = _start_span(
        run_id, "retrieval", "retrieve_postmortems",
        {"service": ticket["service"], "severity": ticket["severity"]},
        parent_span_id=s_class,
    )
    _record_retrieval(s_post, [{
        "source_name": f"postmortem-{ticket['service']}-2026.pdf",
        "source_uri": f"s3://postmortems/postmortem-{ticket['service']}-2026.pdf",
        "rank": 1, "score": 0.93,
        "content_snippet": "Root cause: upstream pool saturation. Remediation: scale-up.",
    }])
    _end_span(s_post, {"documents": [f"postmortem-{ticket['service']}-2026.pdf"]},
              metrics={"input_tokens": 96, "output_tokens": 24, "estimated_cost_usd": 0.0014})

    s_runbook = _start_span(
        run_id, "tool_call", "lookup_runbook",
        {"ticket_id": ticket["id"]},
        parent_span_id=s_class,
    )
    runbook_name = f"runbook-{ticket['service']}-2026"
    _end_span(s_runbook, {"matched_runbook": runbook_name},
              metrics={"input_tokens": 32, "output_tokens": 12, "estimated_cost_usd": 0.0009})

    s_report = _start_span(
        run_id, "model_call", "generate_triage_report",
        {"runbook": runbook_name, "severity": ticket["severity"]},
        parent_span_id=s_runbook,
        model_name=profile["model_name"], prompt_version=profile["prompt_version"],
        temperature=profile["temperature"],
    )
    _end_span(s_report, {"answer": f"Triage ready for {ticket['id']} via {runbook_name}."},
              metrics={"input_tokens": 188, "output_tokens": 64, "estimated_cost_usd": 0.0026})
    return s_runbook


def _emit_compliance_success_chain(run_id: str, profile: dict, contract: dict) -> str:
    s_parse = _start_span(
        run_id, "tool_call", "parse_document",
        {"contract_id": contract["doc_id"]},
        tool_name="pdfplumber-parser",
    )
    _end_span(s_parse, {"pages": 142},
              metrics={"input_tokens": 64, "output_tokens": 18, "estimated_cost_usd": 0.0011})

    s_lang = _start_span(
        run_id, "model_call", "detect_language",
        {"pages": 142},
        parent_span_id=s_parse,
        model_name=profile["model_name"], temperature=0.0,
    )
    _end_span(s_lang, {"language": contract["language"], "confidence": 0.99},
              metrics={"input_tokens": 102, "output_tokens": 12, "estimated_cost_usd": 0.0013})

    # Only translate if non-English.
    parent = s_lang
    if contract["language"] != "en-US":
        s_translate = _start_span(
            run_id, "tool_call", "translate_clauses",
            {"language": contract["language"]},
            parent_span_id=s_lang,
            tool_name="deepl-translator",
        )
        _end_span(s_translate, {"translated_pages": 142},
                  metrics={"input_tokens": 320, "output_tokens": 280, "estimated_cost_usd": 0.0044})
        parent = s_translate

    s_ret = _start_span(
        run_id, "retrieval", "retrieve_policy_clauses",
        {"contract_type": contract["type"]},
        parent_span_id=parent,
    )
    _record_retrieval(s_ret, [{
        "source_name": "policy-v6.1.pdf",
        "source_uri": "s3://docs/policy-v6.1.pdf",
        "rank": 1, "score": 0.93,
        "content_snippet": "Liability cap is fixed at 12 months of fees.",
    }])
    _end_span(s_ret, {"documents": ["policy-v6.1.pdf"]},
              metrics={"input_tokens": 72, "output_tokens": 18, "estimated_cost_usd": 0.0015})

    s_risk = _start_span(
        run_id, "model_call", "classify_risk",
        {"contract_id": contract["doc_id"]},
        parent_span_id=s_ret,
        model_name=profile["model_name"], prompt_version=profile["prompt_version"],
    )
    _end_span(s_risk, {"risk_level": "low"},
              metrics={"input_tokens": 260, "output_tokens": 38, "estimated_cost_usd": 0.0031})

    s_summary = _start_span(
        run_id, "model_call", "generate_summary",
        {"contract_id": contract["doc_id"], "risk": "low"},
        parent_span_id=s_risk,
        model_name=profile["model_name"], prompt_version=profile["prompt_version"],
        temperature=profile["temperature"],
    )
    _end_span(s_summary, {"summary": "Compliant with policy-v6.1.pdf."},
              metrics={"input_tokens": 140, "output_tokens": 90, "estimated_cost_usd": 0.0026})
    return s_ret


# ===========================================================================
# Scenario seeders (one per workflow x kind).
# ===========================================================================

def _seed_support_success(query: str, days_ago: int, profile: dict):
    run_id, _ = _start_run(query, days_ago=days_ago)
    retrieval_id = _emit_support_success_chain(run_id, profile, query)
    _record_artifact(run_id, retrieval_id, "pdf", "refund-policy-2026.pdf", "s3://docs/")
    _end_run(run_id, "success", {"answer": f"Answered: {query}"})
    print(f"  support success · {query[:48]}")


def _seed_support_failure(scenario: dict, days_ago: int, profile: dict):
    run_id, _ = _start_run(scenario["query"], days_ago=days_ago)
    failure_type = scenario["name"]

    # Always emit a classify_topic + retrieve + grounding chain, then either
    # promote grounding to warning OR stop after generate_answer.
    s_route = _start_span(
        run_id, "model_call", "route_intent",
        {"query": scenario["query"]},
        model_name=profile["model_name"], prompt_version=profile["prompt_version"],
        temperature=profile["temperature"],
    )
    _end_span(s_route, {"intent": "account_billing", "confidence": 0.88},
              metrics={"input_tokens": 92, "output_tokens": 14, "estimated_cost_usd": 0.0012})

    s_class = _start_span(
        run_id, "model_call", "classify_topic",
        {"intent": "account_billing"},
        parent_span_id=s_route,
        model_name=profile["model_name"], prompt_version=profile["prompt_version"],
    )
    _end_span(s_class, {"topic": "refund_policy"},
              metrics={"input_tokens": 134, "output_tokens": 22, "estimated_cost_usd": 0.0016})

    s_ret = _start_span(
        run_id, "retrieval", "retrieve_policy_docs",
        {"query": scenario.get("tool_args", {}).get("query", scenario["query"])},
        parent_span_id=s_class,
    )

    if failure_type == "stale_source":
        _record_retrieval(s_ret, [{
            "source_name": scenario["stale_doc"],
            "source_uri": f"s3://docs/{scenario['stale_doc']}",
            "rank": 1, "score": 0.88,
            "content_snippet": "Annual plans are non-refundable after the first 14 days.",
        }])
        _end_span(s_ret, {"documents": [scenario["stale_doc"]]},
                  metrics={"input_tokens": 80, "output_tokens": 20, "estimated_cost_usd": 0.0011})
    elif failure_type == "wrong_tool":
        _record_retrieval(s_ret, [])
        _end_span(s_ret, {"documents": []},
                  metrics={"input_tokens": 80, "output_tokens": 0, "estimated_cost_usd": 0.0011})
    elif failure_type == "wrong_tool_args":
        _record_retrieval(s_ret, [{
            "source_name": "upgrade-policy-2026.pdf",
            "source_uri": "s3://docs/upgrade-policy-2026.pdf",
            "rank": 1, "score": 0.91,
            "content_snippet": "Annual plans can be upgraded at any time.",
        }])
        _end_span(s_ret, {"documents": ["upgrade-policy-2026.pdf"]},
                  metrics={"input_tokens": 80, "output_tokens": 20, "estimated_cost_usd": 0.0011})
    else:
        _record_retrieval(s_ret, [{
            "source_name": "refund-policy-2026.pdf",
            "source_uri": "s3://docs/refund-policy-2026.pdf",
            "rank": 1, "score": 0.94,
            "content_snippet": "Annual plans are refundable within 30 days of purchase.",
        }])
        _end_span(s_ret, {"documents": ["refund-policy-2026.pdf"]},
                  metrics={"input_tokens": 80, "output_tokens": 20, "estimated_cost_usd": 0.0011})

    # grounding span — promote to warning on stale_source, error on formatting/timeout
    s_ground = _start_span(
        run_id, "guardrail", "validate_grounding",
        {"documents": [] if failure_type == "wrong_tool" else ["refund-policy-2026.pdf"]},
        parent_span_id=s_class,
        model_name=profile["model_name"], prompt_version=profile["prompt_version"],
    )
    if failure_type in ("stale_source", "hallucination", "wrong_tool", "missing_escalation"):
        _end_span(s_ground, {"grounded": False, "verified_score": 0.42}, status="warning",
                  metrics={"input_tokens": 210, "output_tokens": 18, "estimated_cost_usd": 0.0024})
    else:
        _end_span(s_ground, {"grounded": True, "verified_score": 0.95},
                  metrics={"input_tokens": 210, "output_tokens": 18, "estimated_cost_usd": 0.0024})

    # terminal span — generate_answer, error on timeout/formatting
    s_answer = _start_span(
        run_id, "model_call", "generate_answer",
        {"prompt": f"Answer: {scenario['query']}"},
        parent_span_id=s_ground,
        model_name=profile["model_name"], prompt_version=profile["prompt_version"],
        temperature=profile["temperature"],
    )
    if failure_type == "timeout":
        _end_span(s_answer, {"error": "upstream timeout after 30s"}, status="error",
                  metrics={"input_tokens": 220, "output_tokens": 0, "estimated_cost_usd": 0.0})
    elif failure_type == "formatting":
        _end_span(s_answer, {"raw": scenario["answer"]}, status="error",
                  metrics={"input_tokens": 140, "output_tokens": 18, "estimated_cost_usd": 0.0023})
    else:
        _end_span(s_answer, {"answer": scenario["answer"]},
                  metrics={"input_tokens": 156, "output_tokens": 88, "estimated_cost_usd": 0.0026})

    # optional extra tool-call span for wrong_tool / wrong_tool_args
    if failure_type in ("wrong_tool", "wrong_tool_args"):
        s_tool = _start_span(
            run_id, "tool_call", scenario["tool"],
            scenario["tool_args"],
            parent_span_id=s_answer,
        )
        _end_span(s_tool, {"result": "tool invocation failed"},
                  metrics={"input_tokens": 18, "output_tokens": 8, "estimated_cost_usd": 0.0006})

    # policy_refusal is a tracked failure but NOT human-reviewable — model
    # behaved correctly.
    requires_review = failure_type != "policy_refusal"
    _end_run(
        run_id,
        "failure",
        {"answer": scenario["answer"] or "(no answer)"},
        failure_type=failure_type,
        requires_review=requires_review,
    )

    if failure_type in ("stale_source", "wrong_tool_args", "hallucination", "formatting"):
        _record_artifact(
            run_id,
            s_ret,
            "pdf",
            scenario.get("stale_doc", "refund-policy-2026.pdf"),
            "s3://docs/",
        )
        _record_annotation(run_id, s_ret, failure_type, scenario["note"])
    elif failure_type in ("missing_escalation", "wrong_tool", "timeout"):
        _record_annotation(run_id, s_answer, failure_type, scenario["note"])

    print(f"  support failure · {failure_type}")


def _seed_incident_success(ticket: dict, days_ago: int, profile: dict):
    query = f"{ticket['title']} on {ticket['service']}"
    run_id, _ = _start_run(query, workflow="it-incident-triage-agent", days_ago=days_ago)
    runbook_id = _emit_incident_success_chain(run_id, profile, ticket)
    _end_run(
        run_id, "success",
        {"ticket_id": ticket["id"], "matched_runbook": f"runbook-{ticket['service']}-2026"},
    )
    print(f"  incident success · {ticket['id']}")


def _seed_incident_failure(scenario: dict, days_ago: int, profile: dict):
    ticket = scenario["ticket"]
    query = f"{ticket['title']} on {ticket['service']}"
    run_id, _ = _start_run(query, workflow="it-incident-triage-agent", days_ago=days_ago)
    failure_type = scenario["name"]

    s_class = _start_span(
        run_id, "model_call", "classify_severity",
        {"ticket": ticket},
        model_name=profile["model_name"], prompt_version=profile["prompt_version"],
        temperature=0.0,
    )

    s_post = _start_span(
        run_id, "retrieval", "retrieve_postmortems",
        {"service": ticket["service"]},
        parent_span_id=s_class,
    )
    if failure_type == "stale_source":
        _record_retrieval(s_post, [{
            "source_name": f"runbook-{scenario['matched_runbook']}.pdf",
            "source_uri": f"s3://postmortems/{scenario['matched_runbook']}.pdf",
            "rank": 1, "score": 0.85,
            "content_snippet": "Stale 2024 webhook retry policy.",
        }])
    elif failure_type == "hallucination":
        _record_retrieval(s_post, [])
    else:
        _record_retrieval(s_post, [{
            "source_name": f"postmortem-{ticket['service']}-2026.pdf",
            "source_uri": f"s3://postmortems/postmortem-{ticket['service']}-2026.pdf",
            "rank": 1, "score": 0.91,
            "content_snippet": "Recent incident context for this service.",
        }])
    _end_span(s_post, {"documents": [scenario.get("matched_runbook", "")]},
              metrics={"input_tokens": 96, "output_tokens": 24, "estimated_cost_usd": 0.0014})

    s_runbook = _start_span(
        run_id, "tool_call", "lookup_runbook",
        {"ticket_id": ticket["id"]},
        parent_span_id=s_class,
    )
    _end_span(s_runbook, {"matched_runbook": scenario["matched_runbook"]},
              metrics={"input_tokens": 30, "output_tokens": 8, "estimated_cost_usd": 0.0008})

    s_report = _start_span(
        run_id, "model_call", "generate_triage_report",
        {"matched_runbook": scenario["matched_runbook"]},
        parent_span_id=s_runbook,
        model_name=profile["model_name"], prompt_version=profile["prompt_version"],
        temperature=profile["temperature"],
    )
    if failure_type == "timeout":
        _end_span(s_report, {"error": "upstream timeout"}, status="error",
                  metrics={"input_tokens": 220, "output_tokens": 0, "estimated_cost_usd": 0.0})
    elif failure_type in ("missing_escalation", "hallucination"):
        _end_span(s_report, {"answer": scenario["answer"]}, status="warning",
                  metrics={"input_tokens": 188, "output_tokens": 64, "estimated_cost_usd": 0.0026})
    else:
        _end_span(s_report, {"answer": scenario["answer"]},
                  metrics={"input_tokens": 188, "output_tokens": 64, "estimated_cost_usd": 0.0026})

    _end_run(
        run_id, "failure",
        {"answer": scenario["answer"] or "(no answer)"},
        failure_type=failure_type,
        requires_review=True,
    )
    _record_annotation(run_id, s_runbook, failure_type, scenario["note"])
    print(f"  incident failure · {failure_type}")


def _seed_compliance_success(contract: dict, days_ago: int, profile: dict):
    query = f"Review contract {contract['doc_id']} ({contract['org']})"
    run_id, _ = _start_run(query, workflow="compliance-review-agent", days_ago=days_ago)
    retrieval_id = _emit_compliance_success_chain(run_id, profile, contract)
    _record_artifact(run_id, retrieval_id, "pdf", "policy-v6.1.pdf", "s3://docs/")
    _end_run(run_id, "success", {"risk_level": "low", "summary": "Compliant"})
    print(f"  compliance success · {contract['doc_id']}")


def _seed_compliance_failure(scenario: dict, days_ago: int, profile: dict):
    contract = scenario["contract"]
    query = f"Review contract {contract['doc_id']} ({contract['org']})"
    run_id, _ = _start_run(query, workflow="compliance-review-agent", days_ago=days_ago)
    failure_type = scenario["name"]

    s_parse = _start_span(
        run_id, "tool_call", "parse_document",
        {"contract_id": contract["doc_id"]},
        tool_name="pdfplumber-parser",
    )
    if failure_type == "timeout":
        _end_span(s_parse, {"error": "parse timeout after 30s"}, status="error",
                  metrics={"input_tokens": 80, "output_tokens": 0, "estimated_cost_usd": 0.0})
        # Stub a classify_risk span so the analytics "Slowest Spans" chart
        # has more variety on timeout runs.
        s_risk_stub = _start_span(
            run_id, "model_call", "classify_risk",
            {"contract_id": contract["doc_id"]},
            parent_span_id=s_parse,
            model_name=profile["model_name"],
        )
        _end_span(s_risk_stub, {"error": "skipped: parse timed out"}, status="error",
                  metrics={"input_tokens": 0, "output_tokens": 0, "estimated_cost_usd": 0.0})
        _end_run(run_id, "failure", {"answer": None}, failure_type=failure_type,
                 requires_review=True)
        _record_annotation(run_id, s_parse, failure_type, scenario["note"])
        print(f"  compliance failure · {failure_type}")
        return
    _end_span(s_parse, {"pages": 142},
              metrics={"input_tokens": 80, "output_tokens": 18, "estimated_cost_usd": 0.0011})

    s_lang = _start_span(
        run_id, "model_call", "detect_language",
        {"pages": 142},
        parent_span_id=s_parse,
        model_name=profile["model_name"], temperature=0.0,
    )
    _end_span(s_lang, {"language": contract["language"]},
              metrics={"input_tokens": 80, "output_tokens": 6, "estimated_cost_usd": 0.0011})

    # wrong_tool_args also exercises the translate_clauses tool.
    if failure_type == "wrong_tool_args":
        s_translate = _start_span(
            run_id, "tool_call", "translate_clauses",
            scenario["tool_args"],
            parent_span_id=s_lang,
            tool_name="deepl-translator",
        )
        _end_span(s_translate, {"error": "unsupported language code ESP"}, status="error",
                  metrics={"input_tokens": 80, "output_tokens": 0, "estimated_cost_usd": 0.0012})

    s_ret = _start_span(
        run_id, "retrieval", "retrieve_policy_clauses",
        {"contract_type": contract["type"]},
        parent_span_id=s_lang,
    )
    _record_retrieval(s_ret, [{
        "source_name": scenario["matched_policy"],
        "source_uri": f"s3://docs/{scenario['matched_policy']}",
        "rank": 1, "score": 0.88,
        "content_snippet": "Matched policy excerpt.",
    }])
    _end_span(s_ret, {"documents": [scenario["matched_policy"]]},
              metrics={"input_tokens": 60, "output_tokens": 18, "estimated_cost_usd": 0.0015})

    s_risk = _start_span(
        run_id, "model_call", "classify_risk",
        {"contract_id": contract["doc_id"]},
        parent_span_id=s_ret,
        model_name=profile["model_name"], prompt_version=profile["prompt_version"],
    )
    _end_span(s_risk, {"risk_level": scenario["risk"]},
              metrics={"input_tokens": 240, "output_tokens": 8, "estimated_cost_usd": 0.0030})

    s_summary = _start_span(
        run_id, "model_call", "generate_summary",
        {"contract_id": contract["doc_id"], "risk": scenario["risk"]},
        parent_span_id=s_risk,
        model_name=profile["model_name"], prompt_version=profile["prompt_version"],
        temperature=profile["temperature"],
    )
    _end_span(s_summary, {"answer": scenario["answer"]},
              metrics={"input_tokens": 140, "output_tokens": 88, "estimated_cost_usd": 0.0026})

    _end_run(
        run_id, "failure",
        {"answer": scenario["answer"], "risk_level": scenario["risk"]},
        failure_type=failure_type,
        requires_review=True,
    )
    _record_annotation(run_id, s_ret, failure_type, scenario["note"])
    print(f"  compliance failure · {failure_type}")


# ===========================================================================
# Enrichment: pre-analyze runs + create eval cases/audit logs.
# ===========================================================================

def _enrich_database() -> tuple[list[str], str | None]:
    """Persist pre-analyzed fields directly via SQLAlchemy.

    We bypass the LLM analyze endpoint because (a) the seed must be
    deterministic and offline, and (b) every demo run should already have
    summary/failure_explanation/patch_suggestion populated so the run
    detail page renders fully without a click.

    Returns the list of failed-run ids and the project id (as a string, not
    the ORM object) so downstream callers don't trip on a detached instance
    after this session closes.
    """
    session = SessionLocal()
    try:
        runs = session.query(Run).all()
        project = session.query(Project).first()

        failed_ids: list[str] = []
        for run in runs:
            summary_text = _build_summary(run)
            run.summary = summary_text
            run.analyzed_at = utc_now() - timedelta(hours=random.randint(0, 36))

            # Override duration_ms with a believable execution time. The
            # end_run endpoint stamps duration_ms = utc_now() - started_at,
            # which on a back-dated seed run balloons to days. Real agent
            # calls complete in single-digit seconds: successes are snappy,
            # failures a bit slower due to retries, timeouts at ~30s.
            run.duration_ms = _realistic_duration_ms(run)

            if run.status == "failure" and run.failure_type:
                analysis = ANALYSIS_MAP.get(run.failure_type, {})
                run.failure_explanation = analysis.get("failure_explanation", "")
                run.patch_suggestion = analysis.get("patch_suggestion", "")
                run.suggested_failure_type = analysis.get(
                    "suggested_failure_type", run.failure_type
                )
                failed_ids.append(run.id)

        session.commit()
        return failed_ids, (project.id if project else None)
    finally:
        session.close()


def _realistic_duration_ms(run: Run) -> int:
    """Return a believable agent-execution duration for the given run.

    The default end_run flow computes ``duration_ms = utc_now() - started_at``,
    which produces nonsensical multi-day values for back-dated seed runs. We
    override that here with realistic single-call latencies:
      - timeout failures: ~30s (the configured upstream timeout)
      - other failures: 2.5–9.5s (retries, guardrails, escalations)
      - successes: 0.9–5.5s (snappy single agent response)
    """
    if run.failure_type == "timeout":
        return random.randint(28_000, 32_000)
    if run.status == "failure":
        return random.randint(2_500, 9_500)
    return random.randint(900, 5_500)


def _build_summary(run: Run) -> str:
    workflow = run.workflow.name if run.workflow else "agent"
    if run.status == "success":
        return f"Successfully answered the user query using {workflow} on 2026-07-{random.randint(1, 27):02d}."
    if run.failure_type == "policy_refusal":
        return f"{workflow.capitalize()} correctly refused a disallowed prompt."
    return f"{workflow.capitalize()} encountered a {run.failure_type} failure during a 2026-07 run."


def _seed_evals_and_audit(failed_ids: list[str], project_id: str | None) -> None:
    """Create 6 EvalCases (using the API) + EvalResults + AuditLog entries."""
    if not project_id or not failed_ids:
        return

    # Pick 6 representative failed runs for eval-case creation. We cycle
    # deterministically to ensure the same scenario always gets an eval.
    eval_targets = failed_ids[:6]
    eval_case_ids: list[str] = []
    for run_id in eval_targets:
        try:
            response = client.post(
                f"/api/v1/evals/from-run/{run_id}", headers=HEADERS
            )
            response.raise_for_status()
            eval_case_ids.append(response.json()["eval_case_id"])
            print(f"  eval case from run {run_id[:8]}")
        except Exception as exc:
            print(f"  eval case creation failed for {run_id[:8]}: {exc}")

    # Bulk-insert eval results showing patch progression: failing → partial → pass
    _insert_eval_results(eval_case_ids)

    # Audit log entries — 5 representative events.
    _insert_audit_logs(project_id, failed_ids, eval_case_ids)


def _insert_eval_results(eval_case_ids: list[str]) -> None:
    """Three EvalResult rows per EvalCase: failing → partial → passing."""
    session = SessionLocal()
    try:
        progression = [
            {
                "score": 0.2,
                "passed": False,
                "prompt_version": "v8.3.0",
                "model_name": "Claude Sonnet 4.6",
                "workflow_version": "v1",
                "temperature": 0.1,
                "judge_reason": "Failed: model used deprecated 2024 policy and fabricated specifics outside the retrieved context.",
                "days_ago": 18,
            },
            {
                "score": 0.62,
                "passed": False,
                "prompt_version": "v9.0.0",
                "model_name": "Kimi K2.7 Code",
                "workflow_version": "v2",
                "temperature": 0.2,
                "judge_reason": "Partial: prompt-version bump fixed the retrieval but date-parsing math still fails.",
                "days_ago": 9,
            },
            {
                "score": 0.95,
                "passed": True,
                "prompt_version": "v12.0.0",
                "model_name": "GPT-5",
                "workflow_version": "v2",
                "temperature": 0.1,
                "judge_reason": "Pass: prompt v12 + GPT-5 correctly referenced policy-v6.1.pdf and validated grounding.",
                "days_ago": 2,
            },
        ]
        for eval_case_id in eval_case_ids:
            for entry in progression:
                result = EvalResult(
                    eval_case_id=eval_case_id,
                    prompt_version=entry["prompt_version"],
                    model_name=entry["model_name"],
                    workflow_version=entry["workflow_version"],
                    temperature=entry["temperature"],
                    score=entry["score"],
                    passed=entry["passed"],
                    judge_reason=entry["judge_reason"],
                    created_at=utc_now() - timedelta(days=entry["days_ago"], hours=random.randint(0, 23)),
                )
                session.add(result)
        session.commit()
        print(f"  seeded {len(eval_case_ids) * len(progression)} eval results")
    finally:
        session.close()


def _insert_audit_logs(project_id: str, failed_ids: list[str], eval_case_ids: list[str]) -> None:
    """5 audit entries — capture realistic project/eval/review activity."""
    session = SessionLocal()
    try:
        entries = [
            {
                "actor": "[email protected]",
                "action": "project.updated",
                "resource_type": "project",
                "resource_id": project_id,
                "note": "Switched capture_mode to 'redacted' to mask PII in ingestion payloads.",
                "days_ago": 24,
            },
            {
                "actor": "system",
                "action": "eval.created",
                "resource_type": "eval_case",
                "resource_id": eval_case_ids[0] if eval_case_ids else project_id,
                "note": "Created regression eval from a stale_source failure on refund-policy-2026.pdf.",
                "days_ago": 16,
            },
            {
                "actor": "[email protected]",
                "action": "review.status_changed",
                "resource_type": "run",
                "resource_id": failed_ids[0] if failed_ids else project_id,
                "note": "Marked missing_escalation review as resolved after legal-team approval.",
                "days_ago": 7,
            },
            {
                "actor": "[email protected]",
                "action": "review.status_changed",
                "resource_type": "run",
                "resource_id": failed_ids[1] if len(failed_ids) > 1 else project_id,
                "note": "Escalated timeout failure on INC-2041 triage to platform on-call.",
                "days_ago": 3,
            },
            {
                "actor": "system",
                "action": "eval.executed",
                "resource_type": "eval_case",
                "resource_id": eval_case_ids[1] if len(eval_case_ids) > 1 else project_id,
                "note": "Partial replay re-reran GPT-5 with prompt v12.0.0; score improved 0.62 → 0.95.",
                "days_ago": 2,
            },
        ]
        for entry in entries:
            log = AuditLog(
                project_id=project_id,
                actor=entry["actor"],
                action=entry["action"],
                resource_type=entry["resource_type"],
                resource_id=entry["resource_id"],
                note=entry["note"],
                created_at=utc_now() - timedelta(days=entry["days_ago"], hours=random.randint(0, 12)),
            )
            session.add(log)
        session.commit()
        print(f"  seeded {len(entries)} audit log entries")
    finally:
        session.close()


# ===========================================================================
# Entry point.
# ===========================================================================

def main() -> None:
    # drop_all is opt-out (default on) for the destructive local-dev path,
    # but the public demo deploy sets AGENTPATCH_DROP_TABLES=0 so the run
    # is idempotent: a second invocation only touches rows via ORM commits.
    if os.getenv("AGENTPATCH_DROP_TABLES", "1") == "1":
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    random.seed(43)

    # Shuffle the profiles once, then cycle forever so any number of seeded
    # scenarios keep pulling a profile without exhausting the iterator.
    profile_choices = list(MODEL_PROFILES)
    random.shuffle(profile_choices)
    profile_iter = cycle(profile_choices)

    print("== Support-policy workflow ==")
    for i, query in enumerate(SUPPORT_SUCCESS_QUERIES):
        _seed_support_success(query, days_ago=DAY_OFFSETS[i % len(DAY_OFFSETS)], profile=next(profile_iter))
    for i, scenario in enumerate(SUPPORT_FAILURES):
        _seed_support_failure(scenario, days_ago=DAY_OFFSETS[(i + 5) % len(DAY_OFFSETS)], profile=next(profile_iter))

    print("== IT-incident triage workflow ==")
    for i, ticket in enumerate(INCIDENT_TICKETS):
        _seed_incident_success(ticket, days_ago=DAY_OFFSETS[(i + 9) % len(DAY_OFFSETS)], profile=next(profile_iter))
    for i, scenario in enumerate(INCIDENT_FAILURES):
        _seed_incident_failure(scenario, days_ago=DAY_OFFSETS[(i + 14) % len(DAY_OFFSETS)], profile=next(profile_iter))

    print("== Compliance review workflow ==")
    for i, contract in enumerate(COMPLIANCE_CONTRACTS):
        _seed_compliance_success(contract, days_ago=DAY_OFFSETS[(i + 17) % len(DAY_OFFSETS)], profile=next(profile_iter))
    for i, scenario in enumerate(COMPLIANCE_FAILURES):
        _seed_compliance_failure(scenario, days_ago=DAY_OFFSETS[(i + 22) % len(DAY_OFFSETS)], profile=next(profile_iter))

    print("== Enrichment ==")
    failed_ids, project_id = _enrich_database()
    _seed_evals_and_audit(failed_ids, project_id)

    total_runs = (
        len(SUPPORT_SUCCESS_QUERIES) + len(SUPPORT_FAILURES)
        + len(INCIDENT_TICKETS) + len(INCIDENT_FAILURES)
        + len(COMPLIANCE_CONTRACTS) + len(COMPLIANCE_FAILURES)
    )
    eval_count = min(
        6,
        len(SUPPORT_FAILURES) + len(INCIDENT_FAILURES) + len(COMPLIANCE_FAILURES),
    )
    print(f"\nDemo seed complete: {total_runs} runs across 3 workflows "
          f"+ ~{eval_count} eval cases + {eval_count * 3} eval results + 5 audit log entries.")


if __name__ == "__main__":
    main()
