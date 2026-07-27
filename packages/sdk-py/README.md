# agentpatch-sdk

Python SDK for emitting traces to AgentPatch Studio.

## Installation

```bash
pip install -e packages/sdk-py
```

## Quick start

```python
from agentpatch import AgentPatch

client = AgentPatch(
    base_url="http://localhost:8000",
    api_key="change-me-in-production",
    workflow_name="support-policy-agent",
    environment="staging",
)

run = client.start_run(input={"user_query": "Can I get a refund?"})
span = client.start_span(run.run_id, span_type="model_call", name="generate_answer")
client.end_span(span.span_id, status="ok", output={"answer": "Yes, within 30 days."})
client.end_run(run.run_id, status="success", output={"answer": "Yes, within 30 days."})
```
