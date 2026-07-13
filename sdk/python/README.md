# Python SDK

Add `sdk/python` to `PYTHONPATH` and construct `ChangeSocietyClient` with scope and actor values. The client covers managed agents, tickets, society runs, decisions, messages, and evaluation. Errors use `ChangeSocietySdkError` with safe API error codes.

`agentcore_agent_sdk` is for agent authors: Universal Agent JSON, LangChain/LangGraph bridges, and signed webhook verification without hard dependency on those frameworks in the control plane.

Judges: [docs/14-submission-pack-index.md](../../docs/14-submission-pack-index.md), [docs/04-protocol-and-sdk.md](../../docs/04-protocol-and-sdk.md).
