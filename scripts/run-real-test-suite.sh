#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=pack-env.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pack-env.sh"

SUITE_DIR="${PACK_ROOT}/evidence/real/suite"
mkdir -p "$SUITE_DIR"

PORT="${CHANGE_SOCIETY_REAL_TEST_PORT:-$("$PACK_PYTHON" -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')}"

export CHANGE_SOCIETY_ENVIRONMENT=development
export CHANGE_SOCIETY_MODEL_PROVIDER=fake
export CHANGE_SOCIETY_STORE=memory
export CHANGE_SOCIETY_ALLOWED_ORIGINS=http://localhost:32501

"$PACK_PYTHON" -m uvicorn change_society.main:app --host 127.0.0.1 --port "$PORT" >"/tmp/change-society-real-suite.log" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  curl -sf "http://127.0.0.1:${PORT}/ready" >/dev/null 2>&1 && break
  sleep 0.25
done

"$PACK_PYTHON" "${PACK_ROOT}/scripts/run_real_test_suite.py" \
  --base-url "http://127.0.0.1:${PORT}" \
  --output-dir "$SUITE_DIR"

"$PACK_PYTHON" "${PACK_ROOT}/scripts/generate_evaluation_evidence.py"

cp "${SUITE_DIR}/checkout-api-refactor.json" "${PACK_ROOT}/evidence/real/society-real-test.json"
