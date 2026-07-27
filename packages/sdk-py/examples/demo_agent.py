"""Demo support-policy agent using the AgentPatch Python SDK.

Run with the API running locally:
    AGENTPATCH_API_BASE_URL=http://localhost:8000 python packages/sdk-py/examples/demo_agent.py

Install the SDK first:
    pip install -e packages/sdk-py
"""

import os
import sys

# Allow running the demo directly from the repo without a pip install.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from agentpatch import AgentPatch, SpanStatus, SpanType  # noqa: E402


API_BASE_URL = os.getenv("AGENTPATCH_API_BASE_URL", "http://localhost:8000")
API_KEY = os.getenv("AGENTPATCH_API_KEY", "change-me-in-production")


def main() -> None:
    with AgentPatch(
        base_url=API_BASE_URL,
        api_key=API_KEY,
        workflow_name="support-policy-agent",
        environment="demo",
    ) as client:
        run = client.start_run(
            input={"user_query": "Can I get a refund for my annual plan?"},
            metadata={"customer_tier": "pro", "channel": "chat"},
        )
        print(f"Started run: {run.run_id}")

        retrieval = client.start_span(
            run.run_id,
            span_type=SpanType("retrieval"),
            name="retrieve_policy_docs",
            input_payload={"query": "annual plan refund policy"},
        )
        client.record_retrieval(
            retrieval.span_id,
            documents=[
                {
                    "source_name": "refund-policy-2024.pdf",
                    "source_uri": "s3://docs/refund-policy-2024.pdf",
                    "rank": 1,
                    "score": 0.94,
                    "content_snippet": "Annual plans are refundable within 30 days of purchase.",
                }
            ],
        )
        client.end_span(
            retrieval.span_id,
            status=SpanStatus("ok"),
            output={"documents": ["refund-policy-2024.pdf"]},
            metrics={"input_tokens": 80, "output_tokens": 20, "estimated_cost_usd": 0.001},
        )

        model = client.start_span(
            run.run_id,
            span_type=SpanType("model_call"),
            name="generate_answer",
            input_payload={"prompt": "Answer: Can I get a refund for my annual plan?"},
        )
        client.end_span(
            model.span_id,
            status=SpanStatus("ok"),
            output={"answer": "Yes, annual plans are refundable within 30 days."},
            metrics={"input_tokens": 120, "output_tokens": 45, "estimated_cost_usd": 0.002},
        )

        client.end_run(
            run.run_id,
            status="success",
            output={"answer": "Yes, annual plans are refundable within 30 days."},
        )
        print(f"Ended run: {run.run_id}")


if __name__ == "__main__":
    main()
