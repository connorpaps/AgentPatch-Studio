"""Demo compliance review agent using the AgentPatch Python SDK.

Simulates reading a contract, running a retrieval against a policy corpus,
classifying risk, and annotating sensitive clauses.

Run with the API running locally:

    AGENTPATCH_API_BASE_URL=http://localhost:8000 python packages/sdk-py/examples/compliance_review_agent.py
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from agentpatch import AgentPatch, CaptureEvent, SpanStatus, SpanType  # noqa: E402


API_BASE_URL = os.getenv("AGENTPATCH_API_BASE_URL", "http://localhost:8000")
API_KEY = os.getenv("AGENTPATCH_API_KEY", "change-me-in-production")


def main() -> None:
    with AgentPatch(
        base_url=API_BASE_URL,
        api_key=API_KEY,
        workflow_name="compliance-review-agent",
        environment="demo",
        capture_mode="full",
    ) as client:
        run = client.start_run(
            input={"contract_id": "MSA-2026-0042", "language": "en-US"},
            metadata={"reviewer": "compliance-bot", "channel": "automated"},
        )
        print(f"Started compliance-review run: {run.run_id}")

        retrieval = client.start_span(
            run.run_id,
            span_type=SpanType("retrieval"),
            name="retrieve_policy_clauses",
            input_payload={"contract_id": "MSA-2026-0042"},
        )
        client.record_retrieval(
            retrieval.span_id,
            [
                {
                    "source_name": "policy-v4.2.pdf",
                    "source_uri": "s3://docs/policy-v4.2.pdf",
                    "rank": 1,
                    "score": 0.92,
                    "content_snippet": "Liability cap is fixed at 12 months of fees.",
                },
                {
                    "source_name": "policy-v4.1.pdf",
                    "source_uri": "s3://docs/policy-v4.1.pdf",
                    "rank": 2,
                    "score": 0.81,
                    "content_snippet": "Termination for convenience requires 60 days notice.",
                },
            ],
        )
        client.end_span(
            retrieval.span_id,
            status=SpanStatus("ok"),
            output={"documents": ["policy-v4.2.pdf", "policy-v4.1.pdf"]},
            metrics={"input_tokens": 60, "output_tokens": 18, "estimated_cost_usd": 0.0015},
        )

        classify = client.start_span(
            run.run_id,
            span_type=SpanType("model_call"),
            name="classify_risk",
            input_payload={"contract_id": "MSA-2026-0042"},
        )
        client.end_span(
            classify.span_id,
            status=SpanStatus("ok"),
            output={"risk_level": "medium", "escalate": False},
            metrics={"input_tokens": 240, "output_tokens": 35, "estimated_cost_usd": 0.003},
        )

        # Record a batched event (one tool-call + one annotation) in a single call.
        events = [
            CaptureEvent(
                type="annotation",
                payload={"label": "needs_review", "note": "Liability clause references v4.2 — confirm with legal."},
            ),
        ]
        results = client.record_events(run.run_id, events)
        for result in results:
            print(f"  event {result.get('type')} ok={result.get('ok')}")

        client.end_run(
            run.run_id,
            status="success",
            output={"risk_level": "medium", "escalate": False, "summary": "Contract compliant with current policy."},
        )
        print(f"Finished compliance-review run: {run.run_id}")


if __name__ == "__main__":
    main()
