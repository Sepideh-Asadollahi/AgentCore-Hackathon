# Change Society service (AgentCore demo backend)

Path: `backend/change-society-service/`

## Purpose

**AgentCore** control-plane API for this repository’s **Change Society** demo: managed agents, capability routing, durable tickets, model and webhook adapters, Universal Agent JSON, evidence-backed negotiation, fail-closed human approval, baseline comparison.

## Public API

`/api/v1/projects/{project_id}/managed-agents`, `/agent-tickets`, `/society-runs`, `/demo-scenarios`, org policy intake routes. OpenAPI at `/docs` when the server is running.

## Layout

Domain, application, infrastructure, interfaces, contracts, and bootstrap are separate. Constructor injection, typed errors, idempotent versioned writes, bounded Qwen calls (replaceable with `fake` model).

## Config

`config/change-society.example.env`, `config/managed-agents.json`, migrations under `migrations/`, deployments [../../deployments/README.md](../../deployments/README.md).

## Tests

When present in your checkout: `bash scripts/run-pytest.sh` (see repository `tests/backend/change-society-service/` in full development trees).

## Judges

[docs/14-submission-pack-index.md](../../docs/14-submission-pack-index.md) · [docs/02-architecture.md](../../docs/02-architecture.md)
