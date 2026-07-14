#!/usr/bin/env bash
# Judge-machine live proof: systemd stack + seven LangGraph scenarios (needs QWEN_API_KEY in .env).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

status() { printf 'STATUS %s %s\n' "$(date -Iseconds)" "$*"; }

PY="${ROOT}/.venv/bin/python"
[[ -x "$PY" ]] || PY="$(command -v python3.12 || command -v python3)"

if [[ ! -f .env ]]; then
  echo "FAIL: missing .env (copy from .env.example and set QWEN_API_KEY)" >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source .env
set +a

: "${QWEN_API_KEY:?QWEN_API_KEY empty — required for live seven-scenario test}"

INTEGRATOR_CFG="${ROOT}/backend/change-society-service/config/managed-agents.integrator-live-all.example.json"
if grep -q '^CHANGE_SOCIETY_MANAGED_AGENTS_CONFIG=' .env; then
  sed -i "s|^CHANGE_SOCIETY_MANAGED_AGENTS_CONFIG=.*|CHANGE_SOCIETY_MANAGED_AGENTS_CONFIG=${INTEGRATOR_CFG}|" .env
else
  echo "CHANGE_SOCIETY_MANAGED_AGENTS_CONFIG=${INTEGRATOR_CFG}" >> .env
fi
set -a
source .env
set +a
export CHANGE_SOCIETY_MANAGED_AGENTS_CONFIG="$INTEGRATOR_CFG"

status "restart API with integrator-live-all managed agents config"
systemctl --user restart change-society-api.service
sleep 4

status "checking systemd user services"
for u in change-society-langgraph-worker change-society-api change-society-web; do
  systemctl --user is-active "${u}.service" >/dev/null || {
    echo "FAIL: ${u}.service not active. Run: bash install.sh --systemd" >&2
    systemctl --user status "${u}.service" || true
    exit 1
  }
done

API_PORT="${CHANGE_SOCIETY_API_PORT:-32500}"
WORKER_PORT="${WORKER_PORT:-32510}"
BASE="http://127.0.0.1:${API_PORT}"

status "curl worker ready :${WORKER_PORT}"
curl -sf "http://127.0.0.1:${WORKER_PORT}/ready" | head -c 400
echo ""
status "curl API health ${BASE}/health"
curl -sf "${BASE}/health" | head -c 400
echo ""
status "curl API ready ${BASE}/ready"
curl -sf "${BASE}/ready" | head -c 600
echo ""

LOG_DIR="${ROOT}/evidence/live/integrator-langgraph-qwen"
mkdir -p "$LOG_DIR"

status "running seven-scenario live suite (may take several minutes)"
"$PY" -u "${ROOT}/scripts/judge_live/run_integrator_live_suite.py" \
  --base-url "$BASE" \
  --output-dir "$LOG_DIR"

if [[ -f "${LOG_DIR}/manifest.json" ]]; then
  "$PY" "${ROOT}/scripts/judge_live/write_judge_seven_summary.py" \
    --manifest "${LOG_DIR}/manifest.json" \
    --out "${LOG_DIR}/langgraph-sdk-judge-summary.json" \
    --title "LangGraph SDK society worker — live seven scenarios (judge server)"
  status "summary ${LOG_DIR}/langgraph-sdk-judge-summary.json"
  head -c 800 "${LOG_DIR}/langgraph-sdk-judge-summary.json" || true
  echo ""
fi

status "live seven-scenario test finished OK"
