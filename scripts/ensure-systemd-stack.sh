#!/usr/bin/env bash
# Enable user systemd units + linger so API / UI / LangGraph worker survive logout and reboot.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if [[ -f .env ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

USER_NAME="${SUDO_USER:-${USER:-root}}"
if [[ "$(id -u)" -eq 0 && -n "${SUDO_USER:-}" ]]; then
  USER_NAME="$SUDO_USER"
fi

units=(
  change-society-langgraph-worker.service
  change-society-api.service
  change-society-web.service
)

loginctl enable-linger "$USER_NAME" 2>/dev/null || loginctl enable-linger root 2>/dev/null || true

systemctl --user daemon-reload
for u in "${units[@]}"; do
  systemctl --user enable "$u"
  systemctl --user restart "$u"
done

sleep 2
for u in "${units[@]}"; do
  systemctl --user is-active "$u" >/dev/null || {
    echo "FAIL: $u not active" >&2
    systemctl --user status "$u" || true
    exit 1
  }
done

API_PORT="${CHANGE_SOCIETY_API_PORT:-32500}"
WEB_PORT="${CHANGE_SOCIETY_WEB_PORT:-32501}"
WORKER_PORT="${WORKER_PORT:-32510}"

echo "OK: systemd user stack active (linger enabled where supported)."
echo "  API:    http://127.0.0.1:${API_PORT}/health"
echo "  UI:     http://0.0.0.0:${WEB_PORT}/  (bind all interfaces)"
echo "  Worker: http://127.0.0.1:${WORKER_PORT}/ready"
