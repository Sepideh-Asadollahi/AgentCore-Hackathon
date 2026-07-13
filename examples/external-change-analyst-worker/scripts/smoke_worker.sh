#!/usr/bin/env bash
# Smoke-test the external worker webhook contract (no society API required).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACK_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
# shellcheck source=../../scripts/pack-env.sh
source "${PACK_ROOT}/scripts/pack-env.sh"

WORKER_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
export PYTHONPATH="${WORKER_ROOT}/src:${PACK_ROOT}/sdk/python"
export AGENTCORE_WEBHOOK_SHARED_SECRET="${AGENTCORE_WEBHOOK_SHARED_SECRET:-integrator-demo-secret-change-me}"

cd "${WORKER_ROOT}"
"$PACK_PYTHON" -m pytest tests -q
echo "Worker contract tests passed."
