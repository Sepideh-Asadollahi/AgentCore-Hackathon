# Change Society SDK

The Python SDK contains two public packages:

- `change_society_sdk`: typed control-plane client for managed agents, tickets, runs, approvals, and evaluation;
- `agentcore_agent_sdk`: Universal Agent JSON, runtime translators, LangChain/LangGraph bridge, and signed webhook worker support for external agent authors.

**Integrator guide (full):** [../docs/26-external-agent-integrator-guide.md](../docs/26-external-agent-integrator-guide.md)

**LangGraph + SDK seven-scenario live proof:** [../docs/29-langgraph-sdk-live-seven-scenarios.md](../docs/29-langgraph-sdk-live-seven-scenarios.md)

**Reference LangGraph webhook worker:** [../examples/external-change-analyst-worker/README.md](../examples/external-change-analyst-worker/README.md)

The Next.js UI has a separate typed browser client in `frontend/lib/api.ts`.

Submission and SDK usage for judges: [../SUBMISSION.md](../SUBMISSION.md), [docs/04-protocol-and-sdk.md](../docs/04-protocol-and-sdk.md).
