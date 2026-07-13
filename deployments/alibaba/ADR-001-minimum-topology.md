# ADR-001 — Minimum Alibaba Cloud Topology for Change Society

## Status

Accepted for hackathon submission (Phase 8, task P8-01).

## Context

Track 3 judging requires a backend running on Alibaba Cloud with repository-visible deployment proof, while the implementation must stay reproducible from the public GitHub repository and avoid duplicate platform products.

## Decision

Deploy the existing production-shaped Compose stack on an entrant-owned Alibaba ECS instance:

- **Compute**: one ECS instance running Docker Engine and Docker Compose.
- **Runtime**: `hackathon/deployments/compose.yaml` services `change-society-api`, `change-society-web`, and `postgres`.
- **Model**: Qwen Cloud via OpenAI-compatible HTTP API (`QWEN_API_KEY` injected at runtime).
- **Persistence**: PostgreSQL 16 with migrations `0001_change_society.sql` and `0002_agent_control_plane.sql`.
- **Ingress**: HTTPS reverse proxy or security-group rules exposing configurable non-default ports `32500` (API) and `32501` (web demo).
- **Proof**: `hackathon/deployments/alibaba/deploy-ecs.sh` uses the official Alibaba Cloud CLI to verify ECS access and documents the deployment channel.

## Consequences

- No ACK Kubernetes, RDS, or additional managed services are required for the MVP gate, reducing setup time and cost.
- Secrets never enter Git; they are injected through the entrant-approved Alibaba secret mechanism on the ECS host.
- Local development continues to use memory/fake profiles; production readiness is validated through `/ready` and `run-live-test.sh`.
- Post-hackathon promotion can migrate the same containers to ACK or managed PostgreSQL without changing domain/application contracts.

## Alternatives Considered

| Option | Rejected because |
|---|---|
| Function Compute only | long-running society runs and PostgreSQL persistence fit a container service better |
| Full ACK cluster | operational overhead exceeds hackathon schedule |
| In-memory demo on cloud | violates production readiness and judging deployment rules |
