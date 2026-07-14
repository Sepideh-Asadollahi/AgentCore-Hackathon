#!/usr/bin/env bash
# Assert UI proxy can complete a society POST (live Qwen runs often exceed 30s).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROXY="${PROXY_URL:-http://127.0.0.1:3200/change-society-api}"
SCENARIO="${SCENARIO_ID:-password-migration}"
IDK="proxy-long-post-$(date +%s)"

echo "NOTE POST via proxy $PROXY (scenario=$SCENARIO, max 300s)"
started=$(date +%s)
code=$(curl -sS -o /tmp/proxy-long.json -w '%{http_code}' --max-time 300 \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: demo-tenant" \
  -H "X-Workspace-Id: demo-workspace" \
  -H "X-Actor-Id: demo-engineering-lead" \
  -H "Idempotency-Key: $IDK" \
  -d "{\"scenario_id\":\"$SCENARIO\"}" \
  "$PROXY/api/v1/projects/demo-project/society-runs")
elapsed=$(( $(date +%s) - started ))
echo "NOTE elapsed=${elapsed}s http=$code"
head -c 400 /tmp/proxy-long.json
echo ""

if [[ "$code" != "200" ]]; then
  echo "FAIL expected HTTP 200 from proxy society-runs POST" >&2
  exit 1
fi

python3 - <<'PY'
import json
d = json.load(open("/tmp/proxy-long.json"))
run = d.get("society_run") or {}
assert run.get("run_id"), d
print("PASS proxy JSON society_run", run.get("run_id"), "state=", run.get("state"))
PY

echo "PASS proxy long POST (${elapsed}s)"
