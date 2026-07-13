#!/usr/bin/env bash
# Smoke-test the external worker webhook contract (no society API required).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
export PYTHONPATH="${ROOT}/hackathon/examples/external-change-analyst-worker/src:${ROOT}/hackathon/sdk/python"
export AGENTCORE_WEBHOOK_SHARED_SECRET="${AGENTCORE_WEBHOOK_SHARED_SECRET:-integrator-demo-secret-change-me}"

cd "${ROOT}/hackathon/examples/external-change-analyst-worker"
"${ROOT}/.venv/bin/python" -m pytest tests -q
echo "Worker contract tests passed."
