#!/usr/bin/env bash
# Judge demo: all 7 scenarios end-to-end with REAL Qwen API (compatible-mode / free tier friendly).
#
# One command — starts API locally, runs full society workflow per scenario, writes redacted evidence.
#
# Requires: hackathon/.env with QWEN_API_KEY
#
#   bash hackathon/scripts/run-qwen-judge-seven-scenarios.sh
#
# Faster / cheaper: uses qwen-flash, skips cross-session follow-up, optional role tools off.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${CHANGE_SOCIETY_ENV_FILE:-$ROOT/hackathon/.env}"
OUT_DIR="$ROOT/hackathon/evidence/live/judge-seven-scenarios"
PORT="${CHANGE_SOCIETY_JUDGE_SUITE_PORT:-32504}"
LOG="$OUT_DIR/run.log"

mkdir -p "$OUT_DIR"
if [[ -f "$ENV_FILE" ]]; then set -a; source "$ENV_FILE"; set +a; fi
: "${QWEN_API_KEY:?Set QWEN_API_KEY in hackathon/.env}"

export PYTHONPATH="$ROOT/hackathon/backend/change-society-service/src:$ROOT/hackathon/sdk/python"
export CHANGE_SOCIETY_ENVIRONMENT=development
export CHANGE_SOCIETY_MODEL_PROVIDER=qwen
export CHANGE_SOCIETY_STORE=memory
export CHANGE_SOCIETY_QWEN_RUN_TOKEN_BUDGET="${CHANGE_SOCIETY_JUDGE_RUN_TOKEN_BUDGET:-120000}"
export QWEN_MODEL="${QWEN_JUDGE_MODEL:-${QWEN_MODEL:-qwen-flash}}"
export QWEN_TIMEOUT_SECONDS="${QWEN_JUDGE_TIMEOUT_SECONDS:-120}"
export CHANGE_SOCIETY_ENABLE_QWEN_ROLE_TOOLS="${CHANGE_SOCIETY_JUDGE_ROLE_TOOLS:-0}"
export CHANGE_SOCIETY_ALLOWED_ORIGINS=http://localhost:32501

echo "==> Judge live 7-scenario suite (model=${QWEN_MODEL}, port=${PORT})" | tee "$LOG"

"$ROOT/.venv/bin/python" -m uvicorn change_society.main:app --host 127.0.0.1 --port "$PORT" >>"$LOG" 2>&1 &
SERVER_PID=$!
cleanup() { kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT

for _ in $(seq 1 90); do
  if curl -sf "http://127.0.0.1:${PORT}/ready" >/dev/null 2>&1; then break; fi
  sleep 0.5
done

"$ROOT/.venv/bin/python" "$ROOT/hackathon/scripts/run_real_test_suite.py" \
  --base-url "http://127.0.0.1:${PORT}" \
  --output-dir "$OUT_DIR" \
  --profile live-qwen \
  --skip-cross-session-follow-up \
  2>&1 | tee -a "$LOG"

"$ROOT/.venv/bin/python" "$ROOT/hackathon/scripts/write_judge_seven_summary.py" --manifest "$OUT_DIR/manifest.json"

cp "$OUT_DIR/checkout-api-refactor.json" "$ROOT/hackathon/evidence/live/society-live-test.json" 2>/dev/null || true

echo "Done. Open: hackathon/evidence/live/judge-seven-scenarios/judge-summary.json"
