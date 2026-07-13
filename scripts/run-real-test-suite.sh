#!/usr/bin/env bash
# Multi-domain deterministic society tests + redacted agent interaction traces.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PORT="${CHANGE_SOCIETY_REAL_TEST_PORT:-$("$ROOT/.venv/bin/python" -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')}"
SUITE_DIR="$ROOT/hackathon/evidence/real/suite"

export PYTHONPATH="$ROOT/hackathon/backend/change-society-service/src:$ROOT/hackathon/sdk/python"
export CHANGE_SOCIETY_ENVIRONMENT=development
export CHANGE_SOCIETY_MODEL_PROVIDER=fake
export CHANGE_SOCIETY_STORE=memory
export CHANGE_SOCIETY_ALLOWED_ORIGINS=http://localhost:32501

"$ROOT/.venv/bin/python" -m uvicorn change_society.main:app --host 127.0.0.1 --port "$PORT" >"/tmp/change-society-real-suite.log" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

"$ROOT/.venv/bin/python" "$ROOT/hackathon/scripts/run_real_test_suite.py" \
  --base-url "http://127.0.0.1:$PORT" \
  --output-dir "$SUITE_DIR" \
  --profile deterministic

"$ROOT/.venv/bin/python" "$ROOT/hackathon/scripts/generate_evaluation_evidence.py"
# Keep golden-path single-scenario report for backward-compatible gates.
"$ROOT/.venv/bin/python" "$ROOT/hackathon/scripts/verify_society_run.py" \
  --base-url "http://127.0.0.1:$PORT" \
  --output "$ROOT/hackathon/evidence/real/society-real-test.json" \
  --profile deterministic \
  --scenario pricing-refactor

echo "Wrote suite manifest: $SUITE_DIR/manifest.json"
