#!/usr/bin/env bash
# Real integrator test: LangGraph agents (all roles) + agentcore_agent_sdk webhook + AgentCore control plane.
set -euo pipefail
# shellcheck source=pack-env.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pack-env.sh"

export CHANGE_SOCIETY_MANAGED_AGENTS_CONFIG="${CHANGE_SOCIETY_MANAGED_AGENTS_CONFIG:-${PACK_ROOT}/backend/change-society-service/config/managed-agents.integrator-live-all.example.json}"
exec bash "${PACK_ROOT}/scripts/run-integrator-live-test.sh"
