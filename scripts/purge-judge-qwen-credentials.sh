#!/usr/bin/env bash
# After live QA passes: remove QWEN_API_KEY from PostgreSQL + .env (never print the key).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PY="${ROOT}/.venv/bin/python"
[[ -x "$PY" ]] || PY="$(command -v python3.12 || command -v python3)"

upsert_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
}

echo "NOTE purging QWEN_API_KEY from database and .env (values not logged)"

set -a
# shellcheck source=/dev/null
source .env
set +a
export CHANGE_SOCIETY_PACK_ROOT="$ROOT"

"$PY" - <<'PY'
import os
import sys
from pathlib import Path

root = Path(os.environ["CHANGE_SOCIETY_PACK_ROOT"]).resolve()
sys.path.insert(0, str(root / "backend" / "change-society-service" / "src"))

from change_society.infrastructure.runtime_secrets_store import delete_runtime_secrets

deleted = delete_runtime_secrets(frozenset({"QWEN_API_KEY"}))
print(f"NOTE database rows deleted: {deleted}")
PY

upsert_env "QWEN_API_KEY" ""
upsert_env "WORKER_LIVE_MODE" "0"
upsert_env "WORKER_USE_LLM" "0"

export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
if systemctl --user is-active change-society-langgraph-worker.service >/dev/null 2>&1; then
  systemctl --user restart change-society-langgraph-worker.service
  sleep 2
fi

status=$(curl -sf "http://127.0.0.1:${WORKER_PORT:-32510}/ready" | python3 -c "import json,sys; d=json.load(sys.stdin); print('live_mode='+str(d.get('live_mode')))" 2>/dev/null || echo "worker_unreachable")
api_status=$(curl -sf "http://127.0.0.1:${CHANGE_SOCIETY_API_PORT:-32500}/api/v1/hackathon/dev/judge-runtime-status" \
  -H "X-Tenant-Id: demo-tenant" -H "X-Workspace-Id: demo-workspace" \
  | python3 -c "import json,sys; print('qwen_configured='+str(json.load(sys.stdin).get('qwen_api_key_configured')))" 2>/dev/null || echo "api_status_unknown")

echo "NOTE worker $status"
echo "NOTE judge-runtime-status $api_status"
echo "PASS QWEN_API_KEY cleared from DB and .env (worker live mode off until Settings apply)"
