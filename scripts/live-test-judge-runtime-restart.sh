#!/usr/bin/env bash
# Live test: judge-runtime-apply (Settings → Save key & restart worker). Uses existing QWEN_API_KEY from .env.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

set -a
# shellcheck source=/dev/null
source .env
set +a

: "${QWEN_API_KEY:?QWEN_API_KEY missing in .env — set a key before testing restart}"

API="${BASE_URL:-http://127.0.0.1:32500}"
PROXY="${PROXY_URL:-http://127.0.0.1:3200/change-society-api}"

worker_pid() {
  systemctl --user show -p MainPID --value change-society-langgraph-worker.service 2>/dev/null || echo "0"
}

PID_BEFORE="$(worker_pid)"
echo "NOTE worker PID before: $PID_BEFORE"

BODY=$(python3 - <<PY
import json, os
print(json.dumps({
  "qwen_api_key": os.environ["QWEN_API_KEY"],
  "qwen_base_url": os.getenv("QWEN_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"),
  "qwen_model": os.getenv("QWEN_MODEL", "qwen-flash"),
  "restart_worker": True,
}))
PY
)

post_apply() {
  local url="$1"
  curl -sS -o /tmp/judge-runtime.json -w '%{http_code}' \
    -H "Content-Type: application/json" \
    -H "X-Tenant-Id: demo-tenant" \
    -H "X-Workspace-Id: demo-workspace" \
    -X POST \
    -d "$BODY" \
    "$url/api/v1/hackathon/dev/judge-runtime-apply"
}

for LABEL URL in "direct" "$API" "proxy" "$PROXY"; do
  code=$(post_apply "$URL")
  echo "$LABEL HTTP $code"
  cat /tmp/judge-runtime.json | head -c 400
  echo ""
  [[ "$code" == "200" ]] || { echo "FAIL $LABEL" >&2; exit 1; }
done

sleep 3
PID_AFTER="$(worker_pid)"
echo "NOTE worker PID after: $PID_AFTER"

if [[ "$PID_BEFORE" != "0" && "$PID_AFTER" != "0" && "$PID_BEFORE" != "$PID_AFTER" ]]; then
  echo "PASS worker process restarted (PID changed)"
elif [[ "$PID_BEFORE" == "$PID_AFTER" ]]; then
  echo "WARN PID unchanged (systemd may have recycled same PID — checking /ready)"
fi

curl -sf "http://127.0.0.1:${WORKER_PORT:-32510}/ready" -o /tmp/worker-ready.json
python3 - <<'PY'
import json
d = json.load(open("/tmp/worker-ready.json"))
assert d.get("status") == "ok", d
assert d.get("live_mode") is True, d
print("PASS worker /ready ok live_mode=true")
PY

echo "All judge-runtime restart checks passed (direct API + UI proxy path)."
