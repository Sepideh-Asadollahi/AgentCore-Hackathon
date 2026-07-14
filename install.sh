#!/usr/bin/env bash
# Change Society installer — monorepo (AgentCore/hackathon/) or standalone published repo root.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -f "$HERE/scripts/install.py" ]]; then
  echo "Missing $HERE/scripts/install.py — run from the hackathon pack root." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1 && ! command -v python3.12 >/dev/null 2>&1; then
  echo "python3.12+ is required. Install Python and retry." >&2
  exit 1
fi

PYTHON=""
for candidate in python3.12 python3; do
  if command -v "$candidate" >/dev/null 2>&1 \
    && "$candidate" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 12) else 1)'; then
    PYTHON="$candidate"
    break
  fi
done
if [[ -z "$PYTHON" ]]; then
  echo "Python 3.12+ is required (e.g. apt install python3.12 python3.12-venv on Ubuntu 22.04)." >&2
  exit 1
fi

exec "$PYTHON" "$HERE/scripts/install.py" "$@"
