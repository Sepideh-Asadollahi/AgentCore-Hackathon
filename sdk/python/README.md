# Python SDK

Add `hackathon/sdk/python` to `PYTHONPATH` and construct `ChangeSocietyClient` with explicit scope and actor values. The SDK exposes managed-agent inventory, heartbeat/lifecycle operations, agent-ticket queries, society runs, decisions, messages, and evaluation. Errors use `ChangeSocietySdkError` and preserve safe API error codes.

The sibling `agentcore_agent_sdk` package is for agent-runtime authors. It provides Universal Agent JSON, translator registration, LangChain/LangGraph `invoke` bridges, and signed webhook worker verification without making LangChain or LangGraph a core dependency.
