# External LangGraph Society Worker (SDK + Webhook)

Reference worker for AgentCore integrators. Implements signed **`/api/v1/agent-tickets:execute`** for `WebhookAgentAdapter`, with LangGraph pipelines for society roles when `WORKER_LIVE_MODE=1`.

**Seven-scenario live proof:** [docs/29-langgraph-sdk-live-seven-scenarios.md](../../docs/29-langgraph-sdk-live-seven-scenarios.md) — `bash ../tests/live/change-society/run-langgraph-sdk-live-seven-scenarios.sh`

## What you get

| Piece | Purpose |
|-------|---------|
| `src/worker/graph/` | LangGraph `StateGraph`: parse evidence → assess risk → RoleOutput |
| `src/worker/executor.py` | Maps execution task → graph → Pydantic `RoleOutput` |
| `src/worker/main.py` | FastAPI `/ready`, `/health`, signed execute endpoint |
| `SignedWebhookWorker` | HMAC verification (shared with control plane) |
| Optional `WORKER_USE_LLM=1` | Qwen JSON refinement after graph |
| `docker-compose.integrator.yml` | Container on port **32510** |
| `tests/` | Contract tests — see [docs/TESTING.md](docs/TESTING.md) |

## Prerequisites

- Python 3.12+
- Repository checkout (`sdk/python` on `PYTHONPATH`)
- Matching shared secret on worker and API service

## Quick start (local)

```bash
cd examples/external-change-analyst-worker
python -m venv .venv && .venv/bin/pip install -r requirements.txt -r requirements-dev.txt

export PYTHONPATH="$PWD/src:$PWD/../../sdk/python"
export AGENTCORE_WEBHOOK_SHARED_SECRET=integrator-demo-secret-change-me

.venv/bin/python src/run_worker.py   # terminal 1
bash scripts/smoke_worker.sh         # terminal 2
```

Worker: **http://localhost:32510**

## Wire the control plane

```bash
export CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET=integrator-demo-secret-change-me
export CHANGE_SOCIETY_MANAGED_AGENTS_CONFIG="$PWD/../../backend/change-society-service/config/managed-agents.integrator.example.json"
```

Start API (from repository root):

```bash
export CHANGE_SOCIETY_MODEL_PROVIDER=fake
export PYTHONPATH=backend/change-society-service/src:sdk/python
.venv/bin/uvicorn change_society.bootstrap.container:build_app --factory --host 0.0.0.0 --port 32500
```

Create a run:

```bash
PYTHONPATH=backend/change-society-service/src:sdk/python \
  .venv/bin/python -c "
from change_society_sdk import ChangeSocietyClient, Scope
c = ChangeSocietyClient('http://localhost:32500', Scope('demo-tenant','demo-workspace','demo-project','integrator'))
run = c.create_run('checkout-api-refactor')
print(run['run_id'], run['state'])
"
```

## Docker

From repository root:

```bash
export CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET=integrator-demo-secret-change-me
docker compose -f examples/external-change-analyst-worker/docker-compose.integrator.yml up --build
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENTCORE_WEBHOOK_SHARED_SECRET` | Yes | Must match `CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET` |
| `WORKER_PORT` | No | Default `32510` |
| `WORKER_USE_LLM` | No | `1` for Qwen refinement |
| `QWEN_API_KEY` | If LLM | Qwen compatible endpoint |

See `.env.example`.

## All roles (live mode)

Use `managed-agents.integrator-live-all.example.json` and:

```bash
bash ../tests/live/change-society/run-langgraph-sdk-live-seven-scenarios.sh
bash ../tests/live/change-society/run-integrator-live-test.sh
bash ../tests/e2e/change-society/run-integrator-e2e.sh
```

## In-process alternative

`agentcore_agent_sdk.RunnableAgentBridge` — [docs/26-external-agent-integrator-guide.md](../../docs/26-external-agent-integrator-guide.md).

## Integrator guide

[docs/26-external-agent-integrator-guide.md](../../docs/26-external-agent-integrator-guide.md)
