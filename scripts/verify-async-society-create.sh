#!/usr/bin/env bash
# Verify async society create (POST returns quickly; run finishes via GET poll).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

API="${BASE_URL:-http://127.0.0.1:32500}"
SCENARIO="${SCENARIO_ID:-password-migration}"
IDK="verify-async-$(date +%s)"

ready=$(curl -sS "$API/ready" || echo "{}")
async_flag=$(python3 - <<PY
import json
try:
    d=json.loads('''$ready''')
except json.JSONDecodeError:
    d={}
print(d.get("checks",{}).get("demo",{}).get("async_run_create"))
PY
)
echo "NOTE /ready async_run_create=$async_flag"

started=$(date +%s)
code=$(curl -sS -o /tmp/async-create.json -w '%{http_code}' --max-time 20 \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: demo-tenant" \
  -H "X-Workspace-Id: demo-workspace" \
  -H "X-Actor-Id: demo-engineering-lead" \
  -H "Idempotency-Key: $IDK" \
  -d "{\"scenario_id\":\"$SCENARIO\"}" \
  "$API/api/v1/projects/demo-project/society-runs")
elapsed=$(( $(date +%s) - started ))
echo "NOTE create POST elapsed=${elapsed}s http=$code"
head -c 300 /tmp/async-create.json
echo ""

[[ "$code" == "200" ]] || { echo "FAIL create HTTP $code" >&2; exit 1; }
[[ "$elapsed" -lt 18 ]] || { echo "FAIL create took too long (${elapsed}s) — enable CHANGE_SOCIETY_ASYNC_RUN_CREATE=1" >&2; exit 1; }

run_id=$(python3 - <<'PY'
import json
d=json.load(open("/tmp/async-create.json"))
print(d["society_run"]["run_id"])
PY
)
state=$(python3 - <<'PY'
import json
d=json.load(open("/tmp/async-create.json"))
print(d["society_run"]["state"])
PY
)
echo "NOTE run_id=$run_id initial_state=$state"

deadline=$(( $(date +%s) + 300 ))
final_state="$state"
while [[ $(date +%s) -lt $deadline ]]; do
  case "$final_state" in
    completed|awaiting_approval|failed|rejected|canceled) break ;;
  esac
  sleep 2
  final_state=$(curl -sS "$API/api/v1/projects/demo-project/society-runs/$run_id" \
    -H "X-Tenant-Id: demo-tenant" -H "X-Workspace-Id: demo-workspace" \
    | python3 -c "import json,sys; print(json.load(sys.stdin)['society_run']['state'])")
  echo "NOTE poll state=$final_state"
done

case "$final_state" in
  completed|awaiting_approval) echo "PASS async create + poll ($final_state)" ;;
  *) echo "FAIL final state=$final_state" >&2; exit 1 ;;
esac
