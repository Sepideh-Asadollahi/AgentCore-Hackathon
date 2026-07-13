# Integrator example worker — testing

This document describes **unit** and **end-to-end** tests for the LangGraph reference worker and how they fit into the main AgentCore pytest suite.

## Test layers

| Layer | What it proves | How to run |
|-------|----------------|------------|
| **Graph nodes** | Evidence parsing, rebuttal detection, risk transitions | Main suite (below) |
| **Executor + Settings** | `RoleOutput` validation, role guard, env loading | Main suite |
| **HTTP webhook** | HMAC, `/ready`, runtime/duration on response | Main suite + local `tests/` |
| **Webhook bridge** | `WebhookAgentAdapter` → worker app (same contract as production) | Main suite |
| **Registry JSON** | `managed-agents.integrator.example.json` shape + endpoint sync | Main suite |
| **Live all roles** | Worker + society + live Qwen on every ticket | `run-integrator-live-test.sh` or `run-langgraph-sdk-live-seven-scenarios.sh` |
| **LangGraph registry** | Six roles compile / invoke | `test_integrator_langgraph_roles.py` |

## Main repository unit tests (canonical)

From repository root:

```bash
bash hackathon/scripts/run-integrator-unit-tests.sh
```

Or explicitly:

```bash
export PYTHONPATH=hackathon/backend/change-society-service/src:hackathon/sdk/python:tests/backend/change-society-service
export AGENTCORE_WEBHOOK_SHARED_SECRET=integrator-demo-secret-change-me
.venv/bin/python -m pytest tests/backend/change-society-service -k integrator -v
```

### Files

| File | Coverage |
|------|----------|
| `tests/backend/change-society-service/integrator_worker_support.py` | `PYTHONPATH`, integrator JSON path, default secret |
| `test_integrator_worker_graph.py` | `parse_inputs`, `assess_risk`, `run_graph` |
| `test_integrator_worker_executor.py` | `Settings`, `WorkerExecutor`, `RoleOutput` |
| `test_integrator_worker_http.py` | FastAPI routes, signature failure, rebuttal |
| `test_integrator_sdk_contract.py` | `AgentCoreExecutionTask`, invalid HMAC |
| `test_integrator_webhook_bridge.py` | Control-plane adapter calling worker |
| `test_integrator_registry_config.py` | Integrator JSON + `ManagedAgent.public()` |
| `test_integrator_agent_registry.py` | `ensure_agents` endpoint/adapter sync |
| `test_integrator_sdk_contract.py` | `AgentCoreExecutionTask`, invalid signature |

Shared SDK tests (not `-k integrator` but required for webhook contract):

| File | Coverage |
|------|----------|
| `test_agent_runtime_sdk.py` | `SignedWebhookWorker`, translators, `RunnableAgentBridge` |
| `test_agent_adapters.py` | `WebhookAgentAdapter` signing + mock HTTP |

## Local worker package tests

The same HTTP contract tests exist under this directory for developers working only in the example folder:

```bash
bash scripts/smoke_worker.sh
```

Prefer the **main suite** for CI and submission evidence — it imports the same `src/worker` code via `integrator_worker_support`.

## Live seven-scenario integrator suite

Requires `QWEN_API_KEY` in `hackathon/.env`:

```bash
bash hackathon/scripts/run-langgraph-sdk-live-seven-scenarios.sh
```

Evidence: `hackathon/evidence/live/integrator-langgraph-qwen/langgraph-sdk-judge-summary.json`.  
Documentation: [../../../docs/29-langgraph-sdk-live-seven-scenarios.md](../../../docs/29-langgraph-sdk-live-seven-scenarios.md).

Unit tests for live-all registry: `test_integrator_live_all_registry.py`.

## End-to-end integrator smoke (change analyst only)

```bash
bash hackathon/scripts/run-integrator-e2e.sh
```

Requires free ports **32500** (society API) and **32510** (worker). Confirms change-analyst tickets complete with `runtime: langgraph-change-analyst`.

## LangGraph optional dependency

If `langgraph` is not installed in the repo `.venv`, the worker uses a **linear fallback** that runs the same node functions (`change_analyst_graph.py`). Unit tests pass in both modes. For a real LangGraph compile:

```bash
pip install -r requirements.txt
```

## Adding tests for a new role worker

1. Add graph nodes and branch in `executor.py` on `task.role`.
2. Extend `test_integrator_worker_graph.py` with role-specific prompts.
3. Add HTTP cases in `test_integrator_worker_http.py` for schema and signature errors.
4. Register a new webhook agent in JSON and extend `test_integrator_registry_config.py`.

See also: [External Agent Integrator Guide](../../docs/26-external-agent-integrator-guide.md).
