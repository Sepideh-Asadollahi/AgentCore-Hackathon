#!/usr/bin/env bash
# Live integrator: ALL roles on external LangGraph+Qwen worker + AgentCore (requires QWEN_API_KEY).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKER_DIR="$ROOT/hackathon/examples/external-change-analyst-worker"
INTEGRATOR_JSON="$ROOT/hackathon/backend/change-society-service/config/managed-agents.integrator-live-all.example.json"
ENV_FILE="${CHANGE_SOCIETY_ENV_FILE:-$ROOT/hackathon/.env}"
SECRET="${CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET:-integrator-demo-secret-change-me}"
WORKER_PORT="${WORKER_PORT:-32510}"
API_PORT="${CHANGE_SOCIETY_INTEGRATOR_API_PORT:-32503}"
PY="${ROOT}/.venv/bin/python"
LOG_DIR="${ROOT}/hackathon/evidence/live/integrator-langgraph-qwen"
SUITE="${INTEGRATOR_LIVE_SUITE:-1}"

if [[ -f "$ENV_FILE" ]]; then set -a; source "$ENV_FILE"; set +a; fi
: "${QWEN_API_KEY:?Set QWEN_API_KEY in hackathon/.env for live integrator tests}"

export AGENTCORE_WEBHOOK_SHARED_SECRET="$SECRET"
export CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET="$SECRET"
export CHANGE_SOCIETY_MANAGED_AGENTS_CONFIG="$INTEGRATOR_JSON"
export CHANGE_SOCIETY_MODEL_PROVIDER=fake
export CHANGE_SOCIETY_STORE=memory
export WORKER_LIVE_MODE=1
export WORKER_USE_LLM=1
export WORKER_RUNTIME_NAME="${WORKER_RUNTIME_NAME:-langgraph-qwen-society-worker}"
export QWEN_TIMEOUT_SECONDS="${QWEN_TIMEOUT_SECONDS:-120}"

WORKER_PID=""
API_PID=""
cleanup() {
  [[ -n "$WORKER_PID" ]] && kill "$WORKER_PID" 2>/dev/null || true
  [[ -n "$API_PID" ]] && kill "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT

mkdir -p "$LOG_DIR"
export PYTHONPATH="$WORKER_DIR/src:$ROOT/hackathon/backend/change-society-service/src:$ROOT/hackathon/sdk/python"

echo "==> External society worker (all roles, live Qwen) :${WORKER_PORT}"
"$PY" "$WORKER_DIR/src/run_worker.py" >"${LOG_DIR}/worker.log" 2>&1 &
WORKER_PID=$!
for _ in $(seq 1 40); do curl -sf "http://127.0.0.1:${WORKER_PORT}/ready" >/dev/null && break; sleep 0.25; done
curl -sf "http://127.0.0.1:${WORKER_PORT}/ready" | tee "${LOG_DIR}/worker-ready.json"

echo "==> AgentCore API (integrator-live-all registry) :${API_PORT}"
"$PY" -m uvicorn change_society.bootstrap.container:build_app --factory --host 127.0.0.1 --port "$API_PORT" \
  >"${LOG_DIR}/api.log" 2>&1 &
API_PID=$!
for _ in $(seq 1 60); do curl -sf "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1 && break; sleep 0.3; done

BASE="http://127.0.0.1:${API_PORT}"
if [[ "$SUITE" == "1" ]]; then
  echo "==> Live integrator suite (all demo scenarios)"
  "$PY" "$ROOT/hackathon/scripts/run_integrator_live_suite.py" --base-url "$BASE" --output-dir "$LOG_DIR"
else
  SCENARIO="${INTEGRATOR_REAL_SCENARIO:-checkout-api-refactor}"
  echo "==> Live integrator single scenario: ${SCENARIO}"
  "$PY" "$ROOT/hackathon/scripts/run_integrator_real_test.py" \
    --base-url "$BASE" \
    --scenario "$SCENARIO" \
    --output-dir "$LOG_DIR" \
    --live-all-roles
fi

echo "Live integrator evidence: ${LOG_DIR}/manifest.json"
if [[ -f "${LOG_DIR}/manifest.json" ]]; then
  "$PY" "$ROOT/hackathon/scripts/write_judge_seven_summary.py" \
    --manifest "${LOG_DIR}/manifest.json" \
    --out "${LOG_DIR}/langgraph-sdk-judge-summary.json" \
    --title "LangGraph SDK society worker — live seven scenarios" || true
fi
