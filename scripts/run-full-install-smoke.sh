#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=_delegate-test-runner.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_delegate-test-runner.sh"
delegate_test_runner "e2e/change-society/run-full-install-smoke.sh" "$@"
