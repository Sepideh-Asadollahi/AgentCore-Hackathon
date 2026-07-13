# Alibaba Cloud Deployment

Repository-visible proof template for Alibaba Cloud. See [ADR-001-minimum-topology.md](ADR-001-minimum-topology.md).

`deploy-ecs.sh` uses the Alibaba Cloud CLI to verify ECS access and deploy the Compose stack to **your** ECS host. It is not run automatically without credentials and a selected instance.

**Environment:** `ALIBABA_REGION_ID`, `ALIBABA_ECS_INSTANCE_ID`, Alibaba CLI auth. The host needs Docker Compose, Git, TLS/network setup, and a secure way to deliver secrets.
