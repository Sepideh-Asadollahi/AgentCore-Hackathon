#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODE="${1:-remote}"
ENV_FILE="${CHANGE_SOCIETY_ENV_FILE:-$ROOT/hackathon/.env}"
REPORT="$ROOT/hackathon/evidence/live/society-live-test.json"

if [[ -f "$ENV_FILE" ]]; then set -a; source "$ENV_FILE"; set +a; fi
export PYTHONPATH="$ROOT/hackathon/sdk/python"

if [[ "$MODE" == "compose" ]]; then
  : "${QWEN_API_KEY:?QWEN_API_KEY is required}"
  : "${AGENTCORE_POSTGRES_PASSWORD:?AGENTCORE_POSTGRES_PASSWORD is required}"
  docker compose -f "$ROOT/hackathon/deployments/compose.yaml" up -d --build
  BASE_URL="${CHANGE_SOCIETY_LIVE_API_URL:-http://127.0.0.1:32500}"
elif [[ "$MODE" == "remote" ]]; then
  BASE_URL="${CHANGE_SOCIETY_LIVE_API_URL:?required for remote mode}"
else
  echo "usage: $0 [remote|compose]" >&2; exit 2
fi

"$ROOT/.venv/bin/python" "$ROOT/hackathon/scripts/verify_society_run.py" --base-url "$BASE_URL" --output "$REPORT" --expect-production
