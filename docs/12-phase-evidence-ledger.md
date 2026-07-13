# Phase Evidence Ledger

This ledger satisfies Phase 0 task P0-08 and tracks exit-gate evidence for Change Society implementation phases. Status values: `not_started`, `in_progress`, `blocked`, `failed`, `passed`, `deferred`.

| Phase | Status | Primary evidence | Verification command / artifact | Owner | Notes |
|---:|---|---|---|---|---|
| 0 | passed | scope freeze, `.env.example`, decision log, this ledger | manual Go/No-Go; entrant eligibility remains human-owned | Change Society team | legal/account gates documented in `08-risks-decisions-and-open-questions.md` |
| 1 | passed | Qwen adapter, config validation, `/health`, `/ready` | `pytest tests/backend/change-society-service/test_qwen_adapter.py`; optional `test_qwen_live.py` with `QWEN_API_KEY` | Change Society team | live call requires entrant key |
| 2 | passed | Universal Agent JSON, OpenAPI operation IDs | `pytest tests/backend/change-society-service/test_change_society.py::test_openapi_has_stable_operation_ids_and_no_duplicate_ids` | Change Society team | |
| 3 | passed | managed agents, tickets, adapters | `pytest tests/backend/change-society-service/test_agent_runtime_sdk.py` | Change Society team | |
| 4 | passed | evidence catalog, cross-session memory | `pytest tests/backend/change-society-service/test_change_society.py::test_approval_is_versioned_idempotent_and_creates_cross_session_memory` | Change Society team | |
| 5 | passed | conflict, rebuttal, approval | `pytest tests/backend/change-society-service/test_change_society.py::test_agent_society_negotiates_and_blocks_for_approval` | Change Society team | |
| 6 | passed | FastAPI + Next.js cinematic + inspector demo | `npm run typecheck && npm run build`; `node --experimental-strip-types --test tests/frontend/change-society/*.test.mjs` | Change Society team | CinematicDemo beats, resume, reduced-motion |
| 7 | passed | three fixed scenarios + baseline | `pytest tests/backend/change-society-service/test_change_society.py::test_all_versioned_demo_scenarios_complete_and_beat_baseline`; `hackathon/scripts/generate_evaluation_evidence.py` | Change Society team | live Qwen comparison remains key-gated |
| 8 | deferred | Compose + Alibaba CLI proof template | `hackathon/deployments/alibaba/ADR-001-minimum-topology.md`, `deploy-ecs.sh` | Entrant | requires Alibaba credentials and public ECS |
| 9 | in_progress | submission pack (engineering complete; entrant media/deploy pending) | `docs/14`–`docs/22`, [SUBMISSION.md](../SUBMISSION.md), [21-release-candidate-and-smoke-checklist.md](21-release-candidate-and-smoke-checklist.md) | Entrant | **Repo/docs/UI/tests/install/SUBMISSION done**; video, Devpost URLs, live Alibaba, Qwen live evidence still entrant-owned |

## Evidence Artifacts (redacted, no secrets)

| Artifact | Path |
|---|---|
| Deterministic end-to-end society run | `hackathon/evidence/real/society-real-test.json` (from `run-real-test.sh`) |
| Three-scenario evaluation table | `hackathon/evidence/real/evaluation-scenarios.json` (from `generate_evaluation_evidence.py`) |
| Live production-shaped run | `hackathon/evidence/live/society-live-test.json` (from `run-live-test.sh`) |

Regenerate deterministic artifacts after material behavior changes.
