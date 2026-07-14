#!/usr/bin/env bash
# Change Society installer — monorepo (AgentCore/hackathon/) or standalone published repo root.
#
# Recommended server install (systemd user units: worker + API + UI):
#   bash install.sh --non-interactive --install-os-deps --systemd
#
# OS packages only (Python 3.12, Node/npm, Docker + Compose v2, curl, git):
#   bash install.sh --prerequisites-only
#
set -euo pipefail

log() {
  printf '[install.sh] %s\n' "$*"
}

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -f "$HERE/scripts/install.py" ]]; then
  echo "Missing $HERE/scripts/install.py — run from the hackathon pack root." >&2
  exit 1
fi

INSTALL_OS_DEPS=0
PREREQUISITES_ONLY=0
FILTERED_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --install-os-deps) INSTALL_OS_DEPS=1; FILTERED_ARGS+=("$arg") ;;
    --prerequisites-only) PREREQUISITES_ONLY=1; INSTALL_OS_DEPS=1 ;;
    --systemd) FILTERED_ARGS+=("$arg") ;;
    *) FILTERED_ARGS+=("$arg") ;;
  esac
done

if [[ "$INSTALL_OS_DEPS" -eq 1 ]]; then
  if [[ ! -f "$HERE/scripts/bootstrap_os_prerequisites.sh" ]]; then
    echo "Missing $HERE/scripts/bootstrap_os_prerequisites.sh" >&2
    exit 1
  fi
  log "Phase 1/2: OS prerequisites (bootstrap_os_prerequisites.sh)"
  bash "$HERE/scripts/bootstrap_os_prerequisites.sh"
fi

if [[ "$PREREQUISITES_ONLY" -eq 1 ]]; then
  log "Prerequisites installed (--prerequisites-only). Run full install: bash install.sh --non-interactive --install-os-deps"
  exit 0
fi

if ! command -v python3 >/dev/null 2>&1 && ! command -v python3.12 >/dev/null 2>&1; then
  echo "python3.12+ is required. Run: bash install.sh --install-os-deps (Debian/Ubuntu) or install Python manually." >&2
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
  echo "Python 3.12+ is required. Run: bash install.sh --install-os-deps" >&2
  exit 1
fi

export AGENTCORE_INSTALL_VERBOSE=1
for arg in "${FILTERED_ARGS[@]}"; do
  if [[ "$arg" == "--quiet" ]]; then
    export AGENTCORE_INSTALL_VERBOSE=0
    break
  fi
done

log "Phase 2/2: Application install (scripts/install.py)"
log "Using interpreter: $PYTHON"
exec "$PYTHON" -u "$HERE/scripts/install.py" "${FILTERED_ARGS[@]}"
