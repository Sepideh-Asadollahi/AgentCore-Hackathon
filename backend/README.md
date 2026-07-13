# Change Society Backend

Path: `hackathon/backend`

## Purpose

Contains the competition-specific Python and FastAPI backend while preserving the long-term AgentCore service boundaries.

## Boundary

The backend owns managed-agent registry, durable AgentTicket lifecycle, capability routing, AgentAdapter dispatch, SocietyRun orchestration, Universal Agent JSON validation, bounded negotiation, approval control, and evaluation. It manages external workers and does not own their private agent loops.

## Rules

- Domain and application code do not depend on FastAPI, PostgreSQL, or Qwen SDK details.
- Concrete dependencies are wired only in bootstrap.
- PostgreSQL is the only runtime persistence product; unit tests use an injected in-memory fake.
- Runtime behavior is configuration-driven and project-scoped.

## Status

Active hackathon vertical slice.

## Documentation

- Service README: [change-society-service/README.md](change-society-service/README.md)
- Submission entry: [../SUBMISSION.md](../SUBMISSION.md)
