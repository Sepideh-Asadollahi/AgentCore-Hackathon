#!/usr/bin/env bash
# Run integrator unit tests (reference worker + registry + webhook bridge).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export PYTHONPATH="${ROOT}/hackathon/backend/change-society-service/src:${ROOT}/hackathon/sdk/python:${ROOT}/tests/backend/change-society-service"
export AGENTCORE_WEBHOOK_SHARED_SECRET="${AGENTCORE_WEBHOOK_SHARED_SECRET:-integrator-demo-secret-change-me}"
exec "${ROOT}/.venv/bin/python" -m pytest "${ROOT}/tests/backend/change-society-service" -k "integrator" -q "$@"
