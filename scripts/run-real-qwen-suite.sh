#!/usr/bin/env bash
# Live Qwen multi-domain suite (requires hackathon/.env with QWEN_API_KEY).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${CHANGE_SOCIETY_ENV_FILE:-$ROOT/hackathon/.env}"
SUITE_DIR="$ROOT/hackathon/evidence/live/suite"
PORT="${CHANGE_SOCIETY_QWEN_SUITE_PORT:-32502}"

if [[ -f "$ENV_FILE" ]]; then set -a; source "$ENV_FILE"; set +a; fi
: "${QWEN_API_KEY:?Set QWEN_API_KEY in hackathon/.env}"

export PYTHONPATH="$ROOT/hackathon/backend/change-society-service/src:$ROOT/hackathon/sdk/python"
export CHANGE_SOCIETY_ENVIRONMENT=development
export CHANGE_SOCIETY_MODEL_PROVIDER=qwen
export CHANGE_SOCIETY_STORE=memory
export CHANGE_SOCIETY_QWEN_RUN_TOKEN_BUDGET="${CHANGE_SOCIETY_QWEN_SUITE_TOKEN_BUDGET:-80000}"
export QWEN_TIMEOUT_SECONDS="${QWEN_TIMEOUT_SECONDS:-120}"
export CHANGE_SOCIETY_ALLOWED_ORIGINS=http://localhost:32501

"$ROOT/.venv/bin/python" -m uvicorn change_society.main:app --host 127.0.0.1 --port "$PORT" >"/tmp/change-society-qwen-suite.log" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

"$ROOT/.venv/bin/python" "$ROOT/hackathon/scripts/run_real_test_suite.py" \
  --base-url "http://127.0.0.1:$PORT" \
  --output-dir "$SUITE_DIR" \
  --profile live-qwen

cp "$SUITE_DIR/checkout-api-refactor.json" "$ROOT/hackathon/evidence/live/society-live-test.json"

echo "Wrote live suite: $SUITE_DIR/manifest.json (gitignored under live/)"
echo "Wrote live golden report: hackathon/evidence/live/society-live-test.json"
