# shellcheck shell=bash
# Delegate to tests/ runners (monorepo AgentCore/tests or pack-local tests/).
delegate_test_runner() {
  local rel="$1"
  shift
  local caller="${BASH_SOURCE[1]:-${BASH_SOURCE[0]}}"
  local here
  here="$(cd "$(dirname "$caller")" && pwd)"
  local pack
  pack="$(cd "$here/.." && pwd)"
  local repo
  repo="$(cd "$pack/.." && pwd)"
  local candidate
  for tests_root in "$repo/tests" "$pack/tests"; do
    candidate="${tests_root}/${rel}"
    if [[ -f "$candidate" ]]; then
      exec bash "$candidate" "$@"
    fi
  done
  echo "Test runner not found: tests/${rel} (pack=${pack})" >&2
  exit 1
}
