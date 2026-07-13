# AgentCore deployments

Deployment assets for the **Change Society** demo on **AgentCore** (Compose, Alibaba ECS templates).

| Path | Purpose |
|---|---|
| [compose.yaml](compose.yaml) | Local/integration stack (API, web, PostgreSQL) |
| [alibaba/](alibaba/) | Alibaba Cloud proof: ADR, `deploy-ecs.sh` |

- **Topology:** [alibaba/ADR-001-minimum-topology.md](alibaba/ADR-001-minimum-topology.md)
- **Operations:** [docs/07-deployment-and-operations.md](../docs/07-deployment-and-operations.md), [docs/22-operations-runbook.md](../docs/22-operations-runbook.md)
- **Competition proof file:** `deployments/alibaba/deploy-ecs.sh` on the default branch

Production deploy needs your own Alibaba account, ECS instance, TLS, and Qwen credentials. This repository ships templates and scripts only.
