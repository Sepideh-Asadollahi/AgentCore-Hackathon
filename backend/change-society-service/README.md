# Change Society Service

Path: `hackathon/backend/change-society-service`

## Purpose

Implements the Agent Society submission as a vendor-neutral agent control plane: managed-agent registry, capability routing, durable tickets, model and signed-webhook adapters, Universal Agent JSON, shared evidence, bounded rebuttal, fail-closed human approval, and single-agent comparison.

## Owner

Hackathon Agent Society team.

## Modular Boundary

Owns ManagedAgent, AgentTicket, SocietyRun, AgentMessage, ConflictRecord, ApprovalDecision, control-plane orchestration, and evaluation. It does not own agent execution loops or existing AgentCore core-data or memory-service stores.

## Public Interfaces

FastAPI endpoints under `/api/v1/projects/{project_id}/managed-agents`, `/agent-tickets`, `/society-runs`, and `/demo-scenarios`. OpenAPI uses stable operation IDs, snake_case DTOs, structured errors, scope headers, correlation IDs, pagination, and idempotency.

## Engineering Standards

Domain, application, infrastructure, interfaces, contracts, and bootstrap are separate. Dependencies use constructor injection. Expected failures are typed. Run writes are idempotent and versioned. Qwen calls are bounded, observable, validated, and replaceable by a fake.

## Dependencies

Allowed: FastAPI/Pydantic at transport and contract boundaries, httpx in the Qwen adapter, psycopg in the PostgreSQL adapter.

Forbidden: provider or persistence clients in domain/application logic; direct reads from another service database; browser-owned business state.

## Testing

Executable tests live at `tests/backend/change-society-service/`.

## Operational Notes

See `config/change-society.example.env`, `config/managed-agents.json`, migrations `0001` and `0002`, and `hackathon/deployments/README.md`.

Judge/API overview: [../../SUBMISSION.md](../../SUBMISSION.md), OpenAPI at `/docs` when server is running.

## Status

Active MVP implementation.
