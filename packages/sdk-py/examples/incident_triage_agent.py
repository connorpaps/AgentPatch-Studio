"""Demo IT-incident triage agent using the AgentPatch Python SDK.

Run with the API running locally:

    AGENTPATCH_API_BASE_URL=http://localhost:8000 python packages/sdk-py/examples/incident_triage_agent.py

Install the SDK first:

    pip install -e packages/sdk-py
"""

import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from agentpatch import AgentPatch, CaptureEvent, SpanStatus, SpanType  # noqa: E402


API_BASE_URL = os.getenv("AGENTPATCH_API_BASE_URL", "http://localhost:8000")
API_KEY = os.getenv("AGENTPATCH_API_KEY", "change-me-in-production")

TICKETS = [
    {"id": "INC-1041", "title": "API latency spike", "service": "payments-api", "severity": "high"},
    {"id": "INC-1042", "title": "Nginx 502 on checkout", "service": "web", "severity": "critical"},
    {"id": "INC-1043", "title": "Background worker crash", "service": "ingest", "severity": "medium"},
]


def _choose_outcome(ticket: dict, rng: random.Random) -> tuple[str, list[str], dict]:
    """Pick a triage outcome that exercises tool calls + a model decision."""
    tools: list[str] = []
    if "latency" in ticket["title"].lower() or "502" in ticket["title"].lower():
        tools.append("lookup_runbook")
        chosen_runbook = "runbook-nginx-502" if "502" in ticket["title"].lower() else "runbook-latency"
        answer = f"Most likely cause: upstream saturated pool. Follow {chosen_runbook}."
    elif "crash" in ticket["title"].lower():
        tools.append("lookup_runbook")
        answer = "Worker OOM detected; restart with memory ceiling."
    else:
        tools.append("lookup_runbook")
        chosen_runbook = rng.choice(["runbook-latency", "runbook-nginx-502"])
        answer = f"Matched runbook: {chosen_runbook}"

    if ticket["severity"] == "critical":
        answer += " Escalating to on-call immediately."
    return answer, tools, {"ticket_id": ticket["id"], "chosen_runbook": tools[-1] if tools else None}


def main() -> None:
    rng = random.Random()
    ticket = rng.choice(TICKETS)
    answer, tool_names, meta = _choose_outcome(ticket, rng)

    with AgentPatch(
        base_url=API_BASE_URL,
        api_key=API_KEY,
        workflow_name="it-incident-triage-agent",
        environment="demo",
        capture_mode="full",
    ) as client:
        run = client.start_run(
            input={"ticket_id": ticket["id"], "title": ticket["title"], "service": ticket["service"]},
            metadata={"severity": ticket["severity"], "channel": "pagerduty"},
        )
        print(f"Started incident-triage run: {run.run_id} for {ticket['id']}")

        # Build a small batching of events for the upstream classification step.
        classify_span = client.start_span(
            run.run_id,
            span_type=SpanType("model_call"),
            name="classify_incident",
            input_payload={"ticket": ticket},
        )

        tool_spans = []
        for tool in tool_names:
            tool_span = client.start_span(
                run.run_id,
                span_type=SpanType("tool_call"),
                name=tool,
                input_payload={"ticket_id": ticket["id"]},
                parent_span_id=classify_span.span_id,
            )
            tool_spans.append((tool_span.span_id, tool))

        client.end_span(
            classify_span.span_id,
            status=SpanStatus("ok"),
            output={"answer": answer, "tool_names": tool_names},
            metrics={"input_tokens": 220, "output_tokens": 60, "estimated_cost_usd": 0.004},
        )

        for span_id, tool in tool_spans:
            client.end_span(
                span_id,
                status=SpanStatus("ok"),
                output={"matched_runbook": tool},
                metrics={"input_tokens": 30, "output_tokens": 12, "estimated_cost_usd": 0.001},
            )

        client.end_run(
            run.run_id,
            status="success",
            output={"answer": answer, "metadata": meta},
        )
        print(f"Finished incident-triage run: {run.run_id}")


if __name__ == "__main__":
    main()
