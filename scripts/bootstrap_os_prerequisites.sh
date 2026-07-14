#!/usr/bin/env bash
# Install OS-level prerequisites for AgentCore Change Society (Debian/Ubuntu via apt).
# Invoked from install.sh when --install-os-deps or --prerequisites-only is set.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() {
  printf '[bootstrap] %s\n' "$*"
}

run() {
  log "→ $*"
  "$@"
}

linux_debian_family() {
  [[ -f /etc/os-release ]] || return 1
  grep -qE '^(ID=debian|ID=ubuntu|ID_LIKE=.*debian)' /etc/os-release
}

have_python312() {
  command -v python3.12 >/dev/null 2>&1 \
    && python3.12 -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 12) else 1)'
}

ensure_python312_ubuntu_deadsnakes() {
  if have_python312; then
    return 0
  fi
  if ! grep -q 'VERSION_ID="22.04"' /etc/os-release 2>/dev/null; then
    return 1
  fi
  log "Ubuntu 22.04: enabling deadsnakes PPA for Python 3.12…"
  run sudo apt-get install -y software-properties-common
  run sudo add-apt-repository -y ppa:deadsnakes/ppa
  run sudo apt-get update
  run sudo apt-get install -y python3.12 python3.12-venv python3.12-dev
}

install_debian_packages() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "AgentCore OS prerequisites (Debian/Ubuntu apt)"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  run sudo apt-get update
  log "Installing base tools: ca-certificates curl git"
  run sudo apt-get install -y ca-certificates curl git

  if have_python312; then
    log "Python 3.12 already present: $(python3.12 --version)"
  else
    log "Installing Python 3.12 + venv…"
    if ! sudo apt-get install -y python3.12 python3.12-venv 2>/dev/null; then
      ensure_python312_ubuntu_deadsnakes || true
    fi
  fi
  if ! have_python312; then
    echo "FAIL: Python 3.12+ is required. Install python3.12 and python3.12-venv, then re-run install.sh." >&2
    exit 1
  fi

  log "Installing Node.js, npm, Docker Engine, Docker Compose v2 plugin…"
  run sudo apt-get install -y nodejs npm docker.io docker-compose-v2

  if command -v docker >/dev/null 2>&1; then
    log "Enabling Docker service…"
    sudo systemctl enable --now docker 2>/dev/null || sudo service docker start 2>/dev/null || true
  fi

  if command -v docker >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
    echo "FAIL: docker compose plugin missing after apt install docker-compose-v2." >&2
    exit 1
  fi

  log "✓ Prerequisites OK"
  log "    Python: $(python3.12 --version 2>/dev/null || true)"
  log "    Node:   $(node --version 2>/dev/null || echo 'missing — install Node 20+ manually if npm is too old')"
  log "    Docker: $(docker --version 2>/dev/null || echo missing)"
  log "    Compose:$(docker compose version 2>/dev/null | head -1 || echo missing)"
}

main() {
  if ! linux_debian_family; then
    cat >&2 <<'EOF'
OS prerequisite bootstrap supports Debian/Ubuntu (apt) only.
Install manually (see README → Manual install — prerequisites):
  Python 3.12+ (venv), Node.js 20+, npm, Docker Engine, Docker Compose v2 plugin, curl, git
EOF
    exit 1
  fi
  if ! command -v sudo >/dev/null 2>&1; then
    echo "FAIL: sudo is required for --install-os-deps on this host." >&2
    exit 1
  fi
  install_debian_packages
}

main "$@"
