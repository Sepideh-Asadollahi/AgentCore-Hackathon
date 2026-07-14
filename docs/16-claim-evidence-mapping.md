# Claim–Evidence Mapping

Maps **public claims** to **reviewable proof**. Use only claims supported by the linked artifact. Distinguish **deterministic (fake model)** evidence from **live Qwen / Alibaba** evidence.

## Track 3 — Agent Society Requirements

| Claim | Proof type | Artifact / command | Notes |
|---|---|---|---|
| Distinct agent capabilities | Code + test | `config/managed-agents.json`; `test_change_society.py::test_agent_society_negotiates_and_blocks_for_approval` | Six managed roles incl. frontend delivery lead |
| Task decomposition & routing | Code + test | Ticket lifecycle assertions in same test; UI ticket panel | Seven tickets, lifecycle states |
| Directed dialogue / negotiation | Code + test | `rebuttal_request` messages; 2 rebuttal IDs on conflict | One bounded round |
| Conflict resolution | Code + test | `ConflictRecord` resolved; judge `coordinator_decision` message | Risk disagreement changes outcome |
| Persistent cross-session memory | Code + test | `test_approval_is_versioned_idempotent_and_creates_cross_session_memory` | `memory_*` in second run |
| Measurable gain vs single agent | Data + test | `evidence/real/evaluation-scenarios.json`; `test_all_demo_domains.py`; `test_all_versioned_demo_scenarios_complete_and_beat_baseline` | Seven domains; not statistically significant |
| End-to-end workflow + human checkpoint | E2E | **Judges:** `tests/live/change-society/run-judge-seven-scenarios.sh` → `live/judge-seven-scenarios/judge-summary.json` (`judge-live`, real Qwen agents). Regression: `run-real-test-suite.sh` → `real/suite/*` (fake model). UI approval | [27-judge-live-and-real-test-evidence.md](27-judge-live-and-real-test-evidence.md) |
| Real Qwen Cloud use | Live only | `run-judge-seven-scenarios.sh`; `test_qwen_live.py` with `QWEN_API_KEY`; `evidence/live/judge-seven-scenarios/` | See [28-judge-seven-scenario-live-qwen-smoke.md](28-judge-seven-scenario-live-qwen-smoke.md) |
| Alibaba Cloud backend | Live + repo file | `deployments/alibaba/deploy-ecs.sh`; `infrastructure/alibaba_ecs.py` (Python `DescribeInstances`); ADR-001; public API URL | **Entrant must deploy** |
| Repo self-check (Track 3 gates) | API | `GET /api/v1/hackathon/submission-compliance` | Lists requirements + local demo gate |
| Batch evaluation (7 scenarios) | API + artifact | `POST .../society-runs:evaluate-all-scenarios`; `evaluation-scenarios.json`; `benchmark-summary.json` | Includes `aggregate` and per-scenario `ablation` |
| Ablation (4 variants) | Code + API | `application/ablation.py`; `evaluate-baseline` → `ablation.variants` | Single agent; no negotiation; no Policy Guardian; full society |
| Negotiation UI for judges | Frontend | `NegotiationPanel.tsx` in cinematic + inspector | Initial positions, conflict, rebuttal, decision, approvals |
| Qwen cost guardrail | Code + config | `BudgetEnforcingModelClient`; `CHANGE_SOCIETY_QWEN_RUN_TOKEN_BUDGET` | Raises `qwen_budget_exceeded`; quota → `qwen_quota_exhausted` |

## Judging Criteria (from submission plan)

| Criterion | Claim | Evidence |
|---|---|---|
| Innovation | Universal Agent JSON + memory-aware negotiation | [02-architecture.md](02-architecture.md) sequence diagram; message list in UI; [04-protocol-and-sdk.md](04-protocol-and-sdk.md) |
| AI creativity | Structured Qwen roles, schemas, rebuttal | [03-qwen-cloud-integration.md](03-qwen-cloud-integration.md); `contracts/messages.py`; adapter tests |
| Technical depth | State machine, idempotency, typed errors | Domain `RunState`; `test_idempotency_conflict_and_project_isolation`; OpenAPI stable IDs test |
| Engineering | Modular boundaries, health, tests | Layer READMEs; `/health`, `/ready`; pytest + frontend state tests |
| Value | Better impact/policy coverage on fixed scenarios | `evaluation-scenarios.json` tradeoffs per scenario |
| Scalability | Reusable policies & contracts | HLD post-hackathon section; managed-agent registry model |
| Presentation | Understandable demo | [17-video-storyboard-and-recording-guide.md](17-video-storyboard-and-recording-guide.md); SUBMISSION judge path |

## Metric Claims (safe wording)

| Metric | Source field | Allowed public statement |
|---|---|---|
| Critical impact recall | `society_metrics.critical_impact_recall` vs baseline | “On fixed synthetic scenario X, society recall was A vs baseline B (n=1 run per mode, deterministic profile).” |
| Policy match recall | `policy_match_recall` | Same pattern; show raw `raw.policy_found / policy_total` |
| Tokens | `total_tokens` vs baseline input+output | “Society used more tokens for multi-role coverage; tradeoff disclosed.” |
| Latency | `model_duration_ms` | Demonstrative only; not a SLA claim |

**Do not claim:** statistical significance, production incident reduction, or universal accuracy improvement.

## Video ↔ Evidence Alignment

Each segment in [17-video-storyboard-and-recording-guide.md](17-video-storyboard-and-recording-guide.md) should map to at least one row above. If a segment cannot be linked, remove or re-record.

## Alibaba Proof Link (Devpost)

Required form: **direct public repository file** demonstrating Alibaba API/CLI use:

`hackathon/deployments/alibaba/deploy-ecs.sh`

Secondary in-repo proof (same API family):

`hackathon/backend/change-society-service/src/change_society/infrastructure/alibaba_ecs.py`

Live backend on Alibaba is proven separately via `{{PUBLIC_API_URL}}` and optional `society-live-test.json` (redacted).
