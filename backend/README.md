# AgentCore backend (Change Society service)

Path: `backend/`

## Purpose

FastAPI backend for the **AgentCore** agent control plane (hackathon demo: **Change Society**): managed agents, tickets, society runs, negotiation, and human approval.

## Boundary

Owns registry, routing, orchestration, Universal Agent JSON, evaluation, and approval enforcement. Does not run external agents' private loops.

## Rules

- Domain and application code stay free of FastAPI/PostgreSQL/Qwen wiring details.
- Dependencies wired in bootstrap only.
- PostgreSQL for production persistence; in-memory store for demo/tests.
- Project-scoped configuration.

## Documentation

- Service: [change-society-service/README.md](change-society-service/README.md)
- Judges: [docs/14-submission-pack-index.md](../docs/14-submission-pack-index.md)
