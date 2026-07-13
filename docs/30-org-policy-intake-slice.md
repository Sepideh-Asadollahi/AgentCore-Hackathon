# 30 - Org Policy Intake (Hackathon Slice)

## Purpose

This document defines the **hackathon-thin** implementation of guided business and process intake from `docs/04-rule-engine-orchestration/07-custom-rule-authoring-and-suggestion-workflows.md`. It is intentionally smaller than the full AgentCore rule engine: no rule-pack import, no passive conversation mining inbox, no full admin rule editor.

The slice proves one judge-facing story:

> **The organization states how work should run; the control plane proposes policies and challenges; the human resolves challenges and activates org policy evidence; Policy Guardian retrieves that evidence on the next society run.**

## In scope (hackathon)

| Capability | Behavior |
| --- | --- |
| Guided narrative | User submits `process_narrative` + optional `constraints` for a selected demo scenario. |
| Analysis | Keyword-heuristic inference of policy tags + gap map vs scenario `required_policies`. |
| Challenge queue | One unresolved challenge at a time in the UI (scope, catalog overlap tradeoffs). |
| Activation | Human adopts candidates; org policies stored as `kind=policy` evidence with ids `org_policy_*`. |
| Retrieval | `ScenarioEvidenceProvider.retrieve()` merges org policies into context (score boost for org evidence). |
| LLM-managed summary | On activate, each policy gets an `llm_managed_summary` string for operators (deterministic text in demo; live Qwen refinement is a platform follow-up). |

## Out of scope (deferred to AgentCore platform doc 07)

- Full intake session persistence in PostgreSQL
- Conversation-derived suggestion inbox
- Rule conflict engine across org packs
- Feature profile changes from intake
- Bulk workspace policy replication

## API (project-scoped)

Headers: `X-Tenant-Id`, `X-Workspace-Id`, `X-Actor-Id` (mutations).

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/v1/projects/{project_id}/org-policy-intake:analyze` | Start session; return digest, candidates, challenges. |
| `GET` | `/api/v1/projects/{project_id}/org-policy-intake/{session_id}` | Fetch session state. |
| `POST` | `/api/v1/projects/{project_id}/org-policy-intake/{session_id}/challenges/{challenge_id}:resolve` | Body: `{ "option_id": "..." }`. |
| `POST` | `/api/v1/projects/{project_id}/org-policy-intake/{session_id}:activate` | Body: `{ "adopted_candidate_ids": ["cand_..."] }`. |
| `GET` | `/api/v1/projects/{project_id}/org-policies` | List active org policy evidence for the project. |

## Demo UX

- **Cinematic mode:** collapsible **00 · Org policy intake** before the first run.
- **Inspector mode:** full-width intake panel above the change-request form.

Recommended judge path:

1. Open `checkout-api-refactor`.
2. Run intake with narrative mentioning API / mobile / `taxIncluded`.
3. Resolve scope + overlap challenges.
4. Activate policies.
5. Start society run — Policy Guardian context includes `org_policy_*` evidence.

## Implementation map

| Layer | Location |
| --- | --- |
| Heuristics + challenge builder | `hackathon/backend/change-society-service/src/change_society/application/org_policy_intake.py` |
| Session + org evidence store | `hackathon/backend/change-society-service/src/change_society/infrastructure/evidence_catalog.py` |
| Service façade | `change_society/application/service.py` |
| HTTP | `change_society/interfaces/api.py`, `schemas.py` |
| UI | `hackathon/frontend/components/OrgPolicyIntakePanel.tsx` |
| Tests | `tests/backend/change-society-service/test_org_policy_intake.py` |
| Frontend tests | `tests/frontend/change-society/org-policy-intake.test.mjs` |
| UI helpers | `hackathon/frontend/lib/org-policy-intake.ts` |

## Related documents

- Platform vision: `docs/04-rule-engine-orchestration/07-custom-rule-authoring-and-suggestion-workflows.md`
- Architecture: `hackathon/docs/02-architecture.md` (governance + evidence)
- Pitch framing: `hackathon/docs/25-pitch-and-demo-focus.md` (introduce after golden scenario, not in first 20 seconds)

## Acceptance (hackathon)

- Analyze returns at least one candidate for checkout API narrative.
- Challenges must be resolved before activate.
- Activated org policy appears in `GET /org-policies` and in `retrieve()` for the matching scenario.
- Society run can cite `org_policy_*` in Policy Guardian evidence refs when the model path includes them (deterministic fake model uses scenario tags regardless; live Qwen uses retrieved evidence text).

## Test plan (automated)

Run the dedicated suite:

```bash
bash hackathon/scripts/run-pytest.sh tests/backend/change-society-service/test_org_policy_intake.py -q
node --experimental-strip-types --test tests/frontend/change-society/org-policy-intake.test.mjs
```

### Backend (`test_org_policy_intake.py`)

| Test | Intent |
| --- | --- |
| `test_infer_gdpr_and_privacy_tags_together` | Multi-tag inference from compliance narrative |
| `test_candidates_to_activate_skips_catalog_only_resolution` | Overlap challenge `catalog_only` blocks activation |
| `test_build_candidate_policies_includes_scenario_required_tags` | Gap fill includes scenario `required_policies` |
| `test_service_analyze_rejects_short_narrative` | Service validation (&lt; 20 chars) |
| `test_service_full_intake_flow` | Service-layer analyze → resolve all → activate → list |
| `test_society_run_succeeds_after_org_policy_activation` | Regression: society run still reaches approval gate |
| `test_api_org_policy_intake_happy_path` | Full HTTP flow + correlation id |
| `test_api_analyze_validation_error_for_short_narrative` | Pydantic / validation rejection |
| `test_api_activate_before_challenges_resolved_returns_validation_error` | Fail closed on pending challenges |
| `test_api_resolve_unknown_challenge_returns_not_found` | 404 challenge id |
| `test_api_get_unknown_session_returns_not_found` | 404 session id |
| `test_org_policies_isolated_per_project` | Separate in-memory stores per service instance / project |
| `test_provider_retrieve_includes_org_policy_after_activation` | Evidence merge in catalog |
| `test_provider_activate_blocks_while_challenges_pending` | Provider validation |

### Frontend (`org-policy-intake.test.mjs`)

| Test | Intent |
| --- | --- |
| `firstPendingChallenge` | Wizard shows one challenge at a time |
| `allChallengesResolved` | Activate button gating |
| `defaultCandidateIds` | Adopt-all candidate ids for activation API |

### Manual smoke (judges)

1. Cinematic → **00 · Org policy intake** → Analyze → resolve challenges → Activate.
2. Run `checkout-api-refactor` → inspect Policy Guardian message evidence refs (live Qwen) or retrieval via `GET .../org-policies`.

Documented in [06-testing-and-evaluation.md](06-testing-and-evaluation.md) and release gate row below.
