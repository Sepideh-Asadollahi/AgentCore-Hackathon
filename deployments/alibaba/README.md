# Alibaba Cloud Deployment

This directory is the repository-visible proof template for Alibaba Cloud use. See [ADR-001-minimum-topology.md](ADR-001-minimum-topology.md) for the frozen deployment decision. `deploy-ecs.sh` uses the official Alibaba Cloud CLI to verify ECS access and deploy the Compose stack to an existing entrant-owned ECS host. It is intentionally not executed without credentials and a selected instance.

Required environment: `ALIBABA_REGION_ID`, `ALIBABA_ECS_INSTANCE_ID`, and Alibaba CLI authentication. The target host must have Docker Compose, Git access, TLS/network configuration, and an entrant-approved secret delivery mechanism.
