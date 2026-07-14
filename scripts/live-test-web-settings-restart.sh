#!/usr/bin/env bash
# Live QA: web Settings vs systemd restart (API / worker / UI).
# Usage: BASE_URL=http://127.0.0.1:32500 bash scripts/live-test-web-settings-restart.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BASE_URL="${BASE_URL:-http://127.0.0.1:32500}"
PROXY_URL="${PROXY_URL:-}" # e.g. http://127.0.0.1:3200/change-society-api
PROJECT="${PROJECT_ID:-demo-project}"
TENANT="${TENANT_ID:-demo-tenant}"
WORKSPACE="${WORKSPACE_ID:-demo-workspace}"

api_pid() {
  systemctl --user show -p MainPID --value change-society-api.service 2>/dev/null || echo "0"
}
worker_pid() {
  systemctl --user show -p MainPID --value change-society-langgraph-worker.service 2>/dev/null || echo "0"
}
web_pid() {
  systemctl --user show -p MainPID --value change-society-web.service 2>/dev/null || echo "0"
}

pass=0
fail=0
note() { printf 'NOTE %s\n' "$*"; }
ok() { printf 'PASS %s\n' "$*"; pass=$((pass + 1)); }
bad() { printf 'FAIL %s\n' "$*"; fail=$((fail + 1)); }

API_PID_BEFORE="$(api_pid)"
WORKER_PID_BEFORE="$(worker_pid)"
WEB_PID_BEFORE="$(web_pid)"
note "API PID=$API_PID_BEFORE worker PID=$WORKER_PID_BEFORE web PID=$WEB_PID_BEFORE"

HDR=(-H "X-Tenant-Id: $TENANT" -H "X-Workspace-Id: $WORKSPACE" -H "Content-Type: application/json")

# 1) Workspace scope headers (browser localStorage equivalent) — no server restart
ALT_TENANT="live-test-tenant-$$"
code=$(curl -sS -o /tmp/cs-scenarios.json -w '%{http_code}' "${HDR[@]}" -H "X-Tenant-Id: $ALT_TENANT" \
  "$BASE_URL/api/v1/projects/$PROJECT/demo-scenarios" || echo "000")
count=$(python3 -c "import json; d=json.load(open('/tmp/cs-scenarios.json')); print(len(d.get('items',[])))" 2>/dev/null || echo 0)
if [[ "$code" == "200" && "$count" -gt 0 ]]; then
  ok "demo-scenarios with alternate X-Tenant-Id ($ALT_TENANT) HTTP 200 count=$count (no API restart)"
else
  bad "demo-scenarios alternate tenant code=$code count=$count"
fi

API_PID_AFTER="$(api_pid)"
if [[ "$API_PID_BEFORE" == "$API_PID_AFTER" || "$API_PID_BEFORE" == "0" ]]; then
  ok "API PID unchanged after header-only request ($API_PID_BEFORE -> $API_PID_AFTER)"
else
  bad "API PID changed unexpectedly ($API_PID_BEFORE -> $API_PID_AFTER)"
fi

# 2) Dev LLM apply on default hackathon stack (MODEL_PROVIDER=fake)
llm_body='{"base_url":"https://dashscope-intl.aliyuncs.com/compatible-mode/v1","model":"qwen-plus","api_key":"sk-test-not-real"}'
llm_code=$(curl -sS -o /tmp/cs-llm.json -w '%{http_code}' -X POST "${HDR[@]}" \
  -d "$llm_body" "$BASE_URL/api/v1/hackathon/dev/llm-connection" || echo "000")
llm_msg=$(python3 -c "import json; d=json.load(open('/tmp/cs-llm.json')); print(d.get('error',{}).get('message', d.get('message','')))" 2>/dev/null || cat /tmp/cs-llm.json)
if [[ "$llm_code" == "422" || "$llm_code" == "400" ]]; then
  ok "dev/llm-connection rejected on fake provider (HTTP $llm_code) — UI must use .env + restart API/worker for live LangGraph"
else
  bad "dev/llm-connection unexpected HTTP $llm_code msg=$llm_msg"
fi

API_PID_AFTER2="$(api_pid)"
if [[ "$API_PID_BEFORE" == "$API_PID_AFTER2" || "$API_PID_BEFORE" == "0" ]]; then
  ok "API PID unchanged after dev llm apply attempt"
else
  bad "API PID changed after dev llm apply ($API_PID_BEFORE -> $API_PID_AFTER2)"
fi

# 3) Worker ignores browser-only key (still reads .env at process start)
worker_json=$(curl -sS "http://127.0.0.1:${WORKER_PORT:-32510}/ready" 2>/dev/null || echo "{}")
live=$(python3 -c "import json; print(json.loads('''$worker_json''').get('live_mode'))" 2>/dev/null || echo "?")
WORKER_PID_AFTER="$(worker_pid)"
if [[ "$WORKER_PID_BEFORE" == "$WORKER_PID_AFTER" || "$WORKER_PID_BEFORE" == "0" ]]; then
  ok "LangGraph worker PID unchanged; live_mode=$live (QWEN in worker .env, not web UI)"
else
  bad "Worker PID changed ($WORKER_PID_BEFORE -> $WORKER_PID_AFTER)"
fi

# 4) Optional: same checks via Next proxy (browser path)
if [[ -n "$PROXY_URL" ]]; then
  px_code=$(curl -sS -o /tmp/cs-proxy.json -w '%{http_code}' "${HDR[@]}" \
    "$PROXY_URL/api/v1/projects/$PROJECT/demo-scenarios" || echo "000")
  if [[ "$px_code" == "200" ]]; then
    ok "demo-scenarios via UI proxy $PROXY_URL HTTP 200 (no web/API restart)"
  else
    bad "proxy demo-scenarios HTTP $px_code"
  fi
  WEB_PID_AFTER="$(web_pid)"
  if [[ "$WEB_PID_BEFORE" == "$WEB_PID_AFTER" || "$WEB_PID_BEFORE" == "0" ]]; then
    ok "Web UI PID unchanged after proxy API call"
  else
    bad "Web PID changed ($WEB_PID_BEFORE -> $WEB_PID_AFTER)"
  fi
fi

echo "---"
echo "Summary: $pass passed, $fail failed"
echo "Browser workspace fields (API mode, project/tenant/workspace/actor): localStorage only → reload tab, NO systemd restart."
echo "Apply to running API (dev): only when CHANGE_SOCIETY_MODEL_PROVIDER=qwen — hot-updates in-process API, NO restart."
echo "Default hackathon (fake + LangGraph worker): paste .env snippet → restart API if qwen in-process; restart worker for QWEN_API_KEY."
[[ "$fail" -eq 0 ]]
