#!/usr/bin/env bash
# Backend tests for Change Society (correct PYTHONPATH; avoids broken .venv/bin/pytest shebang on relocated trees).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export PYTHONPATH="${ROOT}/hackathon/backend/change-society-service/src:${ROOT}/hackathon/sdk/python"

PY="${ROOT}/.venv/bin/python"
if [[ ! -x "$PY" ]]; then
  echo "Missing ${ROOT}/.venv — run: bash install.sh" >&2
  exit 1
fi

exec "$PY" -m pytest "${ROOT}/tests/backend/change-society-service" "$@"
