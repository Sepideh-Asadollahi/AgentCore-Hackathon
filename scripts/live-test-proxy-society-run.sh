#!/usr/bin/env bash
# Assert UI proxy can complete a society POST (async create returns fast; poll until settled).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROXY="${PROXY_URL:-http://127.0.0.1:3200/change-society-api}"
SCENARIO="${SCENARIO_ID:-password-migration}"
IDK="proxy-long-post-$(date +%s)"

echo "NOTE POST via proxy $PROXY (scenario=$SCENARIO, create max 45s)"
started=$(date +%s)
code=$(curl -sS -o /tmp/proxy-long.json -w '%{http_code}' --max-time 45 \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: demo-tenant" \
  -H "X-Workspace-Id: demo-workspace" \
  -H "X-Actor-Id: demo-engineering-lead" \
  -H "Idempotency-Key: $IDK" \
  -d "{\"scenario_id\":\"$SCENARIO\"}" \
  "$PROXY/api/v1/projects/demo-project/society-runs")
create_elapsed=$(( $(date +%s) - started ))
echo "NOTE create elapsed=${create_elapsed}s http=$code"
head -c 400 /tmp/proxy-long.json
echo ""

if [[ "$code" != "200" ]]; then
  echo "FAIL expected HTTP 200 from proxy society-runs POST" >&2
  exit 1
fi
if [[ "$create_elapsed" -gt 40 ]]; then
  echo "FAIL create held connection too long (${create_elapsed}s) — enable async create on API" >&2
  exit 1
fi

run_id=$(python3 - <<'PY'
import json
d=json.load(open("/tmp/proxy-long.json"))
print(d["society_run"]["run_id"])
PY
)

deadline=$(( $(date +%s) + 300 ))
state=$(python3 - <<'PY'
import json
print(json.load(open("/tmp/proxy-long.json"))["society_run"]["state"])
PY
)
while [[ $(date +%s) -lt $deadline ]]; do
  case "$state" in
    completed|awaiting_approval|failed|rejected|canceled) break ;;
  esac
  sleep 2
  state=$(curl -sS "$PROXY/api/v1/projects/demo-project/society-runs/$run_id" \
    -H "X-Tenant-Id: demo-tenant" -H "X-Workspace-Id: demo-workspace" \
    | python3 -c "import json,sys; print(json.load(sys.stdin)['society_run']['state'])")
done

echo "NOTE final state=$state after poll"
case "$state" in
  completed|awaiting_approval) echo "PASS proxy async create + poll ($state)" ;;
  *) echo "FAIL final state=$state" >&2; exit 1 ;;
esac
