#!/usr/bin/env bash
# Post-clone smoke on the server (AgentCore-Hackathon standalone repo).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PY="${ROOT}/.venv/bin/python"
if [[ ! -x "$PY" ]]; then
  PY="$(command -v python3.12 || command -v python3 || true)"
fi

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    if [[ -x "${ROOT}/.venv/bin/python" ]]; then
      "${ROOT}/.venv/bin/python" scripts/sync_boot_env.py
    elif [[ -n "$PY" ]]; then
      "$PY" scripts/sync_boot_env.py
    else
      echo "Run bash install.sh first (need Python for .env sync)." >&2
      exit 1
    fi
    echo "Created .env from .env.example (minimum boot) — set QWEN_API_KEY for live LangGraph workers."
  else
    echo "FAIL: missing .env and .env.example" >&2
    exit 1
  fi
fi

set -a
# shellcheck source=/dev/null
source .env
set +a

PY="${ROOT}/.venv/bin/python"
if [[ ! -x "$PY" ]]; then
  echo "Run bash install.sh first." >&2
  exit 1
fi

echo "==> Qwen hello"
"$PY" scripts/qwen_hello_smoke.py

echo "==> Health (API must be running separately or via compose)"
curl -sf "http://127.0.0.1:${CHANGE_SOCIETY_API_PORT:-32500}/health" | head -c 400 || echo "API not up — start: bash scripts/start-langgraph-demo-stack.sh"
