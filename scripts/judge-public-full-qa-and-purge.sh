#!/usr/bin/env bash
# Full public-host QA: seven live scenarios + smoke checks; purge QWEN key only if all green.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
PY="${ROOT}/.venv/bin/python"
[[ -x "$PY" ]] || PY="$(command -v python3.12 || command -v python3)"

fail() { echo "FAIL $*" >&2; exit 1; }
ok() { echo "PASS $*"; }

[[ -f .env ]] || fail "missing .env"
set -a
# shellcheck source=/dev/null
source .env
set +a
: "${QWEN_API_KEY:?QWEN_API_KEY required for live seven-scenario QA}"

WEB_PORT="${CHANGE_SOCIETY_WEB_PORT:-3200}"
PROXY="http://127.0.0.1:${WEB_PORT}/change-society-api"

echo "=== 1/4 systemd stack ==="
for u in change-society-postgres change-society-langgraph-worker change-society-api change-society-web; do
  systemctl --user is-active "${u}.service" >/dev/null 2>&1 || fail "${u}.service not active"
done
ok "systemd units active"

echo "=== 2/4 seven live scenarios (LangGraph + Qwen) ==="
bash scripts/judge-final-live-seven.sh

LOG_DIR="${ROOT}/evidence/live/integrator-langgraph-qwen"
MANIFEST="${LOG_DIR}/manifest.json"
[[ -f "$MANIFEST" ]] || fail "missing manifest $MANIFEST"

"$PY" - <<PY
import json
from pathlib import Path
data = json.loads(Path("$MANIFEST").read_text(encoding="utf-8"))
scenarios = data.get("scenarios") or []
if len(scenarios) != 7:
    raise SystemExit(f"expected 7 scenarios, got {len(scenarios)}")
bad = []
for item in scenarios:
    sid = item.get("scenario_id")
    state = item.get("final_state")
    tickets = item.get("ticket_lifecycle_verified")
    integrator = item.get("langgraph_integrator") or {}
    ext = integrator.get("external_worker_runtime") or integrator.get("worker_integration")
    if state != "completed":
        bad.append(f"{sid}: final_state={state}")
    elif tickets is not True:
        bad.append(f"{sid}: ticket_lifecycle_verified={tickets}")
    elif not ext and not integrator.get("all_roles_webhook"):
        bad.append(f"{sid}: missing langgraph integrator evidence")
if bad:
    raise SystemExit("scenario checks failed: " + "; ".join(bad))
print("PASS seven scenarios completed with integrator evidence")
PY

SUMMARY="${LOG_DIR}/langgraph-sdk-judge-summary.json"
if [[ -f "$SUMMARY" ]]; then
  "$PY" - <<PY
import json
from pathlib import Path
s = json.loads(Path("$SUMMARY").read_text(encoding="utf-8"))
if s.get("status") != "passed":
    raise SystemExit(f"judge summary status={s.get('status')}")
print("PASS judge summary status=passed")
PY
fi

echo "=== 3/4 async create + UI proxy ==="
bash scripts/verify-async-society-create.sh
PROXY_URL="$PROXY" bash scripts/live-test-proxy-society-run.sh

echo "=== 4/4 purge credentials (post-QA) ==="
export CHANGE_SOCIETY_PACK_ROOT="$ROOT"
bash scripts/purge-judge-qwen-credentials.sh

echo "=== ALL PUBLIC HOST QA GREEN; QWEN_API_KEY removed from DB and .env ==="
