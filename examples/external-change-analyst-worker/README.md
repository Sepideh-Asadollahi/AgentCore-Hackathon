# External LangGraph Society Worker (SDK + Webhook)

Production-shaped **reference worker** for AgentCore integrators. It implements the signed **`/api/v1/agent-tickets:execute`** contract expected by `WebhookAgentAdapter` in change-society-service, and runs **LangGraph** pipelines for all six society roles when `WORKER_LIVE_MODE=1`.

**Full live proof (seven scenarios):** [../../docs/29-langgraph-sdk-live-seven-scenarios.md](../../docs/29-langgraph-sdk-live-seven-scenarios.md) — `bash hackathon/scripts/run-langgraph-sdk-live-seven-scenarios.sh`

## What you get

| Piece | Purpose |
|-------|---------|
| `src/worker/graph/` | LangGraph `StateGraph`: parse evidence → assess risk → RoleOutput |
| `src/worker/executor.py` | Maps `AgentCoreExecutionTask` → graph → Pydantic `RoleOutput` |
| `src/worker/main.py` | FastAPI `/ready`, `/health`, signed execute endpoint |
| `SignedWebhookWorker` | HMAC verification (shared with control plane) |
| Optional `WORKER_USE_LLM=1` | Qwen JSON refinement pass after graph |
| `docker-compose.integrator.yml` | Container profile on port **32510** |
| `tests/` | Contract tests (signature + schema) — mirror of main-suite HTTP tests |

**Unit test documentation:** [docs/TESTING.md](docs/TESTING.md)

## Prerequisites

- Python 3.12+
- Repository checkout (for `hackathon/sdk/python` on `PYTHONPATH`)
- Same shared secret on **worker** and **change-society-service**

## Quick start (local)

```bash
cd hackathon/examples/external-change-analyst-worker
python -m venv .venv && .venv/bin/pip install -r requirements.txt -r requirements-dev.txt

export PYTHONPATH="$PWD/src:$PWD/../../sdk/python"
export AGENTCORE_WEBHOOK_SHARED_SECRET=integrator-demo-secret-change-me

# Terminal 1 — worker
.venv/bin/python src/run_worker.py

# Terminal 2 — contract tests
bash scripts/smoke_worker.sh
```

Worker listens on **http://localhost:32510**.

## Wire the control plane

1. Copy or point to integrator registry:

```bash
export CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET=integrator-demo-secret-change-me
export CHANGE_SOCIETY_MANAGED_AGENTS_CONFIG="$PWD/../../backend/change-society-service/config/managed-agents.integrator.example.json"
```

2. Start change-society-service (from repo root, fake model is enough):

```bash
export CHANGE_SOCIETY_MODEL_PROVIDER=fake
export PYTHONPATH=hackathon/backend/change-society-service/src:hackathon/sdk/python
.venv/bin/uvicorn change_society.bootstrap.container:build_app --factory --host 0.0.0.0 --port 32500
```

3. Run a society scenario — **Change Analyst** tickets dispatch to your LangGraph worker; other roles stay on the in-process model adapter.

```bash
PYTHONPATH=hackathon/backend/change-society-service/src:hackathon/sdk/python \
  .venv/bin/python -c "
from change_society_sdk import ChangeSocietyClient, Scope
c = ChangeSocietyClient('http://localhost:32500', Scope('demo-tenant','demo-workspace','demo-project','integrator'))
run = c.create_run('checkout-api-refactor')
print(run['run_id'], run['state'])
"
```

4. Inspect tickets — change analyst ticket should show `runtime: langgraph-change-analyst` (or external) in execution metrics.

## Docker

From **repository root**:

```bash
export CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET=integrator-demo-secret-change-me
docker compose -f hackathon/examples/external-change-analyst-worker/docker-compose.integrator.yml up --build
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENTCORE_WEBHOOK_SHARED_SECRET` | Yes | Must match `CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET` |
| `WORKER_PORT` | No | Default `32510` |
| `WORKER_USE_LLM` | No | `1` to refine graph output with Qwen |
| `QWEN_API_KEY` | If LLM | OpenAI-compatible Qwen endpoint |

See `.env.example`.

## Extend to other roles

All six society roles are implemented in the same worker when `WORKER_LIVE_MODE=1`:

| Role | Output schema | Engine |
|------|---------------|--------|
| `context_scout` | `ContextOutput` | Live Qwen JSON |
| `change_analyst` | `RoleOutput` | LangGraph + live Qwen refine |
| `impact_analyst` | `RoleOutput` | Live Qwen |
| `policy_guardian` | `RoleOutput` | Live Qwen |
| `coordinator_judge` | `JudgeOutput` | Live Qwen |
| `frontend_delivery_lead` | `FrontendDeliveryOutput` | Live Qwen |

Use `managed-agents.integrator-live-all.example.json` and:

```bash
bash hackathon/scripts/run-langgraph-sdk-live-seven-scenarios.sh   # seven scenarios + judge summary
# or
bash hackathon/scripts/run-integrator-live-test.sh
```

To add a **separate** deployment per role:

## In-process alternative (no HTTP)

If your agent runs inside the same process as a custom service, use `agentcore_agent_sdk.RunnableAgentBridge` — see [../../docs/26-external-agent-integrator-guide.md](../../docs/26-external-agent-integrator-guide.md).

## Reference graph behavior (`checkout-api-refactor`)

| Pass | Prompt signal | Graph outcome |
|------|----------------|---------------|
| First change analysis | OpenAPI / `taxIncluded` / `ev_api_diff` without rebuttal | `risk_level: low` (internal refactor narrative) |
| Negotiation rebuttal | `ONE BOUNDED REBUTTAL` + same evidence | `risk_level: high`, breaking contract impacts |

End-to-end verification from repo root:

```bash
bash hackathon/scripts/run-integrator-e2e.sh
```

## Full integrator documentation

[External Agent Integrator Guide](../../docs/26-external-agent-integrator-guide.md)
