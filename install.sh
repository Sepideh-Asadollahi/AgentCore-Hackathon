#!/usr/bin/env bash
# Change Society installer — monorepo (AgentCore/hackathon/) or standalone published repo root.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -f "$HERE/scripts/install.py" ]]; then
  echo "Missing $HERE/scripts/install.py — run from the hackathon pack root." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required (3.12+). Install Python and retry." >&2
  exit 1
fi

exec python3 "$HERE/scripts/install.py" "$@"
