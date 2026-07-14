#!/usr/bin/env bash
# Set .env for browser access via public IP / DNS (systemd UI on CHANGE_SOCIETY_WEB_PORT).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PUBLIC_HOST="${1:-}"
if [[ -z "$PUBLIC_HOST" ]]; then
  echo "Usage: $0 <public-ip-or-hostname>" >&2
  exit 1
fi

ENV_FILE="${ROOT}/.env"
[[ -f "$ENV_FILE" ]] || cp .env.example "$ENV_FILE"

WEB_PORT="${CHANGE_SOCIETY_WEB_PORT:-32501}"
API_PORT="${CHANGE_SOCIETY_API_PORT:-32500}"

upsert() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

upsert "CHANGE_SOCIETY_API_HOST" "0.0.0.0"
origins="http://localhost:${WEB_PORT},http://127.0.0.1:${WEB_PORT},http://${PUBLIC_HOST}:${WEB_PORT}"
upsert "CHANGE_SOCIETY_ALLOWED_ORIGINS" "$origins"
# UI uses same-origin /change-society-api proxy; keep for direct-API mode / tooling.
upsert "NEXT_PUBLIC_CHANGE_SOCIETY_API_URL" "http://${PUBLIC_HOST}:${API_PORT}"

echo "Updated ${ENV_FILE} for public UI at http://${PUBLIC_HOST}:${WEB_PORT}/"
echo "Re-run: bash install.sh --non-interactive --systemd   (or bash scripts/ensure-systemd-stack.sh)"
