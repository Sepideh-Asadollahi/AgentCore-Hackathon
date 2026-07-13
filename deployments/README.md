# Change Society Deployments

| Path | Purpose |
|---|---|
| [compose.yaml](compose.yaml) | Reproducible local/integration topology (API, web, PostgreSQL) |
| [alibaba/](alibaba/) | Competition cloud proof: ADR, README, `deploy-ecs.sh` |

## Quick Reference

- **Architecture decision:** [alibaba/ADR-001-minimum-topology.md](alibaba/ADR-001-minimum-topology.md)
- **Operations:** [../docs/07-deployment-and-operations.md](../docs/07-deployment-and-operations.md), [../docs/22-operations-runbook.md](../docs/22-operations-runbook.md)
- **Devpost Alibaba file link:** `hackathon/deployments/alibaba/deploy-ecs.sh` on public default branch

Real deployment requires entrant-owned Alibaba credentials, region, domain/TLS, Qwen API key, and cost approval. The repository provides templates and scripts only; it does not deploy without entrant action.
