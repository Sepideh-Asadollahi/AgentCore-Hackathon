#!/usr/bin/env bash
# Smoke test: Qwen Cloud free-tier compatible-mode API (operational, uses hackathon/.env).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec "${ROOT}/.venv/bin/python" "${ROOT}/hackathon/scripts/smoke_qwen_free_api.py" "$@"
