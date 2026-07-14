# shellcheck shell=bash
# Source from scripts under the AgentCore pack:  source "$(dirname "$0")/pack-env.sh"
if [[ -n "${PACK_ROOT:-}" && -n "${PACK_PYTHON:-}" ]]; then
  return 0 2>/dev/null || true
fi

_PACK_ENV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACK_ROOT="$(cd "${_PACK_ENV_DIR}/.." && pwd)"

_pack_resolve_python() {
  if [[ -x "${PACK_ROOT}/.venv/bin/python" ]]; then
    echo "${PACK_ROOT}/.venv/bin/python"
    return 0
  fi
  if [[ "$(basename "${PACK_ROOT}")" == hackathon && -x "${PACK_ROOT}/../.venv/bin/python" ]]; then
    echo "${PACK_ROOT}/../.venv/bin/python"
    return 0
  fi
  echo "Missing .venv under ${PACK_ROOT} (or parent when pack is hackathon/). Run: bash install.sh" >&2
  return 1
}

PACK_PYTHON="$(_pack_resolve_python)" || exit 1
export PYTHONPATH="${PACK_ROOT}/backend/change-society-service/src:${PACK_ROOT}/sdk/python"

pack_pytest_dir() {
  if [[ -d "${PACK_ROOT}/tests/backend/change-society-service" ]]; then
    echo "${PACK_ROOT}/tests/backend/change-society-service"
  elif [[ -d "${PACK_ROOT}/../tests/backend/change-society-service" ]]; then
    echo "${PACK_ROOT}/../tests/backend/change-society-service"
  else
    return 1
  fi
}

pack_frontend_test_dir() {
  if [[ -d "${PACK_ROOT}/tests/frontend/change-society" ]]; then
    echo "${PACK_ROOT}/tests/frontend/change-society"
  elif [[ -d "${PACK_ROOT}/../tests/frontend/change-society" ]]; then
    echo "${PACK_ROOT}/../tests/frontend/change-society"
  else
    return 1
  fi
}
