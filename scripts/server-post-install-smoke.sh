#!/usr/bin/env bash
# Post-install smoke on a standalone AgentCore-Hackathon host (no monorepo tests/).
set -euo pipefail
PACK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PACK"

VENV="${PACK}/.venv/bin/python"
[[ -x "$VENV" ]] || VENV="python3"

echo "==> Qwen hello"
"$VENV" scripts/qwen_hello_smoke.py

echo "==> LangGraph worker + API (background)"
SECRET="${CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET:-integrator-demo-secret-change-me}"
export AGENTCORE_WEBHOOK_SHARED_SECRET="$SECRET"
export CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET="$SECRET"
export CHANGE_SOCIETY_MODEL_PROVIDER="${CHANGE_SOCIETY_MODEL_PROVIDER:-fake}"
export WORKER_LIVE_MODE="${WORKER_LIVE_MODE:-1}"
export WORKER_USE_LLM="${WORKER_USE_LLM:-1}"
WORKER_DIR="${PACK}/examples/external-change-analyst-worker"
export PYTHONPATH="${WORKER_DIR}/src:${PACK}/backend/change-society-service/src:${PACK}/sdk/python"

WORKER_PID=""
API_PID=""
cleanup() { kill "$WORKER_PID" "$API_PID" 2>/dev/null || true; }
trap cleanup EXIT

"$VENV" "$WORKER_DIR/src/run_worker.py" &
WORKER_PID=$!
for _ in $(seq 1 60); do curl -sf http://127.0.0.1:32510/ready >/dev/null && break; sleep 0.25; done
curl -sf http://127.0.0.1:32510/ready | head -c 200
echo ""

"$VENV" -m uvicorn change_society.main:app --host 127.0.0.1 --port 32500 &
API_PID=$!
for _ in $(seq 1 60); do curl -sf http://127.0.0.1:32500/health >/dev/null && break; sleep 0.3; done

echo "==> API health"
curl -sf http://127.0.0.1:32500/health
echo ""
echo "==> Create society run (checkout-api-refactor)"
set -a && source .env && set +a
RUN_JSON=$(curl -sf -X POST "http://127.0.0.1:32500/api/v1/projects/demo-project/society-runs" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: demo-tenant" \
  -H "X-Workspace-Id: demo-workspace" \
  -H "X-Actor-Id: demo-engineering-lead" \
  -H "Idempotency-Key: smoke-$(date +%s)" \
  -d '{"scenario_id":"checkout-api-refactor","request_text":"Refactor checkout handler to call pricing service; do not break the HTTP contract."}')
echo "$RUN_JSON" | head -c 400
echo ""
STATE=$(echo "$RUN_JSON" | "$VENV" -c "import sys,json; print(json.load(sys.stdin)['society_run']['state'])")
echo "OK run state=$STATE"
