# Agent Language and LangChain/LangGraph SDK

## Implemented Decision

The hackathon uses Universal Agent JSON v1 as the shared agent language. It is a canonical machine protocol rather than a human language or a hidden prompt convention. The authoritative shared design is [`../../docs/05-interoperability-ecosystem/08-agent-communication-language-and-runtime-sdk.md`](../../docs/05-interoperability-ecosystem/08-agent-communication-language-and-runtime-sdk.md).

The implementation is under `hackathon/sdk/python/agentcore_agent_sdk/` and contains:

- `UniversalAgentMessage` validation;
- `TranslatorRegistry` and `RuntimeTranslator` port;
- `LangChainMessageTranslator`;
- `LangGraphMessageTranslator`;
- `RunnableAgentBridge` for a LangChain Runnable or compiled LangGraph;
- `SignedWebhookWorker` for framework-neutral external agents.

No LangChain or LangGraph package is required by the SDK. The bridge uses their stable `invoke(...)` behavior through structural typing, so the control plane remains vendor-neutral.

## Example: Connect a Compiled LangGraph

```python
from agentcore_agent_sdk import RunnableAgentBridge, UniversalAgentMessage

# compiled_graph is created and owned by the external agent service.
bridge = RunnableAgentBridge(compiled_graph)
result = bridge.execute(assigned_universal_agent_message)
```

The external service can expose `SignedWebhookWorker` through its preferred web framework. AgentCore dispatches the ticket through `WebhookAgentAdapter`, validates the returned schema, and owns ticket transitions and audit. The graph owns its internal nodes, tools, model loop, and private state.

## What This Does Not Do

- It does not turn AgentCore into LangGraph.
- It does not require AgentCore to build agents for customers.
- It does not translate or expose private chain-of-thought.
- It does not let vendor payloads mutate control-plane state.
- It does not replace Qwen Cloud use in the submitted demo.

## Demo Relevance

Show Universal Agent JSON, ticket IDs, translator/adapter boundaries, and Qwen worker results. Mention LangChain/LangGraph as replaceable external runtimes. Do not spend the three-minute video constructing a graph unless the graph itself is used in the live demo.
