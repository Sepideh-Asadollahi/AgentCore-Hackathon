#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=pack-env.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pack-env.sh"

PORT="${CHANGE_SOCIETY_REAL_TEST_PORT:-$("$PACK_PYTHON" -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')}"
REPORT="${PACK_ROOT}/evidence/real/society-real-test.json"

export CHANGE_SOCIETY_ENVIRONMENT=development
export CHANGE_SOCIETY_MODEL_PROVIDER=fake
export CHANGE_SOCIETY_STORE=memory
export CHANGE_SOCIETY_ALLOWED_ORIGINS=http://localhost:32501

"$PACK_PYTHON" -m uvicorn change_society.main:app --host 127.0.0.1 --port "$PORT" >"/tmp/change-society-real-test.log" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

"$PACK_PYTHON" "${PACK_ROOT}/scripts/verify_society_run.py" --base-url "http://127.0.0.1:$PORT" --output "$REPORT"
"$PACK_PYTHON" "${PACK_ROOT}/scripts/generate_evaluation_evidence.py"
