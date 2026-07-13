#!/usr/bin/env bash
# Smoke test: Qwen Cloud free-tier compatible-mode API (uses .env when present).
set -euo pipefail
# shellcheck source=pack-env.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pack-env.sh"
exec "$PACK_PYTHON" "${PACK_ROOT}/scripts/smoke_qwen_free_api.py" "$@"
