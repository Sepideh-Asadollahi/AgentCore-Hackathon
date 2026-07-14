#!/usr/bin/env bash
# Local demo: LangGraph society worker + AgentCore API (default managed-agents.json = webhook all roles).
set -euo pipefail
PACK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$PACK/.." && pwd)"
VENV="${REPO}/.venv/bin/python"
[[ -x "$VENV" ]] || VENV="${PACK}/.venv/bin/python"
[[ -x "$VENV" ]] || VENV="python3"

ENV_FILE="${CHANGE_SOCIETY_ENV_FILE:-${PACK}/.env}"
SECRET="${CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET:-integrator-demo-secret-change-me}"
WORKER_PORT="${WORKER_PORT:-32510}"
API_PORT="${CHANGE_SOCIETY_API_PORT:-32500}"
WORKER_DIR="${PACK}/examples/external-change-analyst-worker"

if [[ -f "$ENV_FILE" ]]; then set -a; source "$ENV_FILE"; set +a; fi
: "${QWEN_API_KEY:?Set QWEN_API_KEY in hackathon/.env — LangGraph workers call Qwen inside the worker process}"

export AGENTCORE_WEBHOOK_SHARED_SECRET="$SECRET"
export CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET="$SECRET"
export CHANGE_SOCIETY_MODEL_PROVIDER="${CHANGE_SOCIETY_MODEL_PROVIDER:-fake}"
export WORKER_LIVE_MODE="${WORKER_LIVE_MODE:-1}"
export WORKER_USE_LLM="${WORKER_USE_LLM:-1}"
export WORKER_RUNTIME_NAME="${WORKER_RUNTIME_NAME:-langgraph-sdk-society-worker}"

export PYTHONPATH="${WORKER_DIR}/src:${PACK}/backend/change-society-service/src:${PACK}/sdk/python"

WORKER_PID=""
API_PID=""
cleanup() {
  [[ -n "$WORKER_PID" ]] && kill "$WORKER_PID" 2>/dev/null || true
  [[ -n "$API_PID" ]] && kill "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "==> LangGraph worker :${WORKER_PORT}"
"$VENV" "$WORKER_DIR/src/run_worker.py" &
WORKER_PID=$!
for _ in $(seq 1 60); do curl -sf "http://127.0.0.1:${WORKER_PORT}/ready" >/dev/null && break; sleep 0.25; done

echo "==> AgentCore control plane API :${API_PORT}"
"$VENV" -m uvicorn change_society.main:app --host 127.0.0.1 --port "$API_PORT" &
API_PID=$!
for _ in $(seq 1 60); do curl -sf "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1 && break; sleep 0.3; done

echo "Ready. Worker http://127.0.0.1:${WORKER_PORT}/ready  API http://127.0.0.1:${API_PORT}/docs"
echo "Start UI: cd hackathon/frontend && npm run dev"
wait
