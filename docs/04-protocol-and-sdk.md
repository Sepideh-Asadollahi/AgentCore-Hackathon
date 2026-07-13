# Universal Agent JSON and SDK

For the **multi-vendor agent network** vision (common language, adapters, federation roadmap), see [23-multi-vendor-agent-network-ecosystem.md](23-multi-vendor-agent-network-ecosystem.md) and the platform doc [09-multi-vendor-agent-network-ecosystem.md](../../docs/05-interoperability-ecosystem/09-multi-vendor-agent-network-ecosystem.md).

Universal Agent JSON v1 is the stable exchange envelope for task assignments, findings, rebuttals, decisions, approvals, and completion. Required fields include protocol/message identity, project scope, sender/recipient roles, capability, task, evidence, confidence, risk, conflicts, next action, idempotency, causation, and token usage.

Unknown versions and cross-project evidence fail closed. Messages are immutable and workflow routing never parses unconstrained chat prose.

## Python SDK

```python
from change_society_sdk import ChangeSocietyClient, Scope

client = ChangeSocietyClient(
    "http://localhost:32500",
    Scope("demo-tenant", "demo-workspace", "demo-project", "engineering-lead"),
)
run = client.create_run("pricing-refactor")
agents = client.list_managed_agents()
tickets = client.list_agent_tickets(run["run_id"])
messages = client.list_messages(run["run_id"])
```

The SDK propagates project scope, actor, correlation, idempotency, typed errors, and stable `/api/v1` paths. It can query ticket lifecycle evidence and control agent heartbeat/state. Browser code uses the typed client in `frontend/lib/api.ts`.
