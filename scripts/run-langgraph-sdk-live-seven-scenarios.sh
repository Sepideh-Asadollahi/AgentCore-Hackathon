#!/usr/bin/env bash
# Real integrator test: LangGraph agents (all roles) + agentcore_agent_sdk webhook + AgentCore control plane.
# Seven scenarios, live Qwen inside each LangGraph pipeline.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export INTEGRATOR_LIVE_SUITE=1
export WORKER_RUNTIME_NAME="${WORKER_RUNTIME_NAME:-langgraph-sdk-society-worker}"
export CHANGE_SOCIETY_MANAGED_AGENTS_CONFIG="${CHANGE_SOCIETY_MANAGED_AGENTS_CONFIG:-$ROOT/hackathon/backend/change-society-service/config/managed-agents.integrator-live-all.example.json}"
exec bash "$ROOT/hackathon/scripts/run-integrator-live-test.sh"
