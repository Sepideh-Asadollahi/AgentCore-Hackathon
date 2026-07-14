# Operations Runbook (Judging Period)

Minimal operations guide for the **public demo** through judging. Complements [07-deployment-and-operations.md](07-deployment-and-operations.md).

## Service Topology

See [../deployments/alibaba/ADR-001-minimum-topology.md](../deployments/alibaba/ADR-001-minimum-topology.md).

| Component | Default port | Health |
|---|---|---|
| Change Society API | 32500 | `GET /health`, `GET /ready` |
| Change Society Web | 3000 | Browser load |
| PostgreSQL | 5432 (internal) | via `/ready` checks.store |

## Configuration Profiles

| Profile | Model | Store | `/ready` |
|---|---|---|---|
| Local demo | `fake` | `memory` | degraded (expected) |
| Production demo | `qwen` | `postgresql` | ok when dependencies up |

Environment template: `hackathon/.env.example`, `config/change-society.example.env`.

## Deploy / Upgrade (ECS + Compose)

1. SSH to entrant ECS host (Alibaba CLI flow in `deploy-ecs.sh`).
2. Pull release tag `{{RELEASE_TAG}}`.
3. Inject secrets via host env (never Git): `QWEN_API_KEY`, `CHANGE_SOCIETY_DATABASE_URL`, `AGENTCORE_POSTGRES_PASSWORD`.
4. `docker compose -f hackathon/deployments/compose.yaml up -d --build`
5. Apply migrations if not automated: `0001_change_society.sql`, `0002_agent_control_plane.sql`.
6. Run `bash tests/live/change-society/run-live-test.sh remote`.

## Rollback

1. Note previous image tag or compose digest.
2. `docker compose ... down`
3. Checkout previous release tag; rebuild and up.
4. Re-run live smoke checklist ([21-release-candidate-and-smoke-checklist.md](21-release-candidate-and-smoke-checklist.md)).

## Monitoring (recommended)

| Signal | Action |
|---|---|
| `/ready` not ok | Check PostgreSQL container, `QWEN_API_KEY`, quota |
| 503 dependency errors | Qwen timeout/rate limit; bounded retry already configured |
| High token usage | Reduce demo traffic; rate limit at ingress |
| Approval stuck | Expected until human action in demo |

Structured logs should include **correlation IDs** from API responses ([08-security.md](08-security.md)).

## Incident During Judging

| Severity | Response |
|---|---|
| Demo down | Rollback; update Devpost only if URL changes (follow rules) |
| Secret leak | Rotate key; scrub logs; do not commit new secrets |
| Data corruption | Restore Postgres volume backup or redeploy from seed |

## Backup

For demo continuity, export PostgreSQL volume or nightly `pg_dump` of demo database only (synthetic data).

## Cost and Quota

- Monitor Alibaba ECS billing and Qwen Cloud quota.
- Set spend alerts before judging window.

## Entrant-Owned

On-call contact, exact URLs, TLS certificates, and monitoring dashboards.
