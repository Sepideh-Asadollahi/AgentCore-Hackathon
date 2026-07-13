# Devpost Field Guide and Submission Checklist

Use this when completing https://qwencloud-hackathon.devpost.com/ . Replace every `{{PLACEHOLDER}}` before submit (see [../ENTRANT_SUBMISSION_URLS.example.md](../ENTRANT_SUBMISSION_URLS.example.md)). Keep all public text in English.

## Track and Product

| Field | Value |
|---|---|
| Grand prize track | **Track 3 — Agent Society** |
| Project name | AgentCore Agent Control Plane — Change Society Demo |
| One-line summary | **Change Society** — a governed multi-agent decision system that turns ambiguous software changes into auditable, negotiated, human-approved decisions (AgentCore control plane + Qwen). |

## Repository and Links (fill before submit)

| Devpost / judging need | Placeholder | Verification |
|---|---|---|
| Public GitHub repository | `{{GITHUB_REPO_URL}}` | Opens logged out; default branch visible |
| Submission entry point | `{{GITHUB_REPO_URL}}/tree/main/hackathon/SUBMISSION.md` | Judge path documented |
| Alibaba Cloud proof (direct file) | `{{GITHUB_REPO_URL}}/blob/main/hackathon/deployments/alibaba/deploy-ecs.sh` | Shows Alibaba CLI usage |
| Architecture diagram | `{{GITHUB_REPO_URL}}/blob/main/hackathon/docs/02-architecture.md` | Mermaid renders on GitHub |
| Live demo (API + UI) | `{{PUBLIC_DEMO_URL}}` | Golden path without payment |
| API health (optional) | `{{PUBLIC_API_URL}}/health` | Returns JSON liveness |
| Demo video | `{{VIDEO_URL}}` | Under 3 minutes; allowed platform |
| Blog Post Award (optional) | `{{BLOG_URL}}` | Public English build journey |

## Description Template (paste into Devpost)

Use sections in this order (from [../06-judging-demo-and-submission-plan.md](../06-judging-demo-and-submission-plan.md)):

1. **Outcome** — Thesis from [25-pitch-and-demo-focus.md](25-pitch-and-demo-focus.md).
2. **Problem** — Hidden API contract break in `checkout-api-refactor` (primary demo scenario).
3. **Workflow** — Control plane → tickets → managed roles → conflict → one rebuttal → human approval → tasks/decision/memory.
4. **Why Qwen** — Role-specific structured JSON via the same adapter; not a single monolithic prompt.
5. **Agent Society proof** — Universal Agent JSON, decomposition, disagreement, bounded negotiation, fail-closed approval.
6. **Memory** — Current evidence included; stale/restricted excluded; second session recalls approved decision.
7. **Architecture & Alibaba** — ECS + Docker Compose stack; link `deploy-ecs.sh` and `{{PUBLIC_DEMO_URL}}`.
8. **Metrics** — Seven fixed scenarios; link `evaluation-scenarios.json`, `benchmark-summary.json`, and [24-baseline-ablation-and-efficiency.md](24-baseline-ablation-and-efficiency.md) (include ablation table).
9. **Significant updates after May 26, 2026** — Copy from [13-pre-hackathon-baseline-and-significant-updates.md](13-pre-hackathon-baseline-and-significant-updates.md).
10. **Try it** — Quickstart commands from [01-quickstart.md](01-quickstart.md); judges can run `run-real-test-suite.sh` without keys.
11. **Limitations** — No production code mutation; deterministic local demo vs live Qwen; expand sample size for statistical claims.

## Pre-Submit Checklist

### Compliance

- [ ] Eligibility personally confirmed per [../01-competition-rules-and-compliance.md](../01-competition-rules-and-compliance.md)
- [ ] Track 3 selected (single grand-prize track)
- [ ] No secrets in repo, video, or screenshots
- [ ] All submission text English (or full English translation)
- [ ] Video uses licensed/original media only
- [ ] Significant-update statement matches actual commits after May 26, 2026

### Technical proof

- [ ] `bash hackathon/scripts/run-real-test.sh` passes from clean clone
- [ ] `pytest tests/backend/change-society-service` passes
- [ ] Frontend `npm run typecheck` and `npm run build` pass
- [ ] Live path: `run-live-test.sh` passed once before claiming Alibaba/Qwen production demo (entrant)
- [ ] `/ready` on public API shows production-ready when using qwen + postgresql (entrant)

### Links (P9-08)

- [ ] Every URL tested logged out
- [ ] Every URL tested on second network or device
- [ ] Video plays for anonymous viewer
- [ ] Blog link public (if claiming Blog Post Award)
- [ ] Demo completes golden path twice from clean seed

### Devpost form

- [ ] Repository URL set
- [ ] Video URL set
- [ ] Track 3 identified
- [ ] Blog URL included in eligible fields (if applicable)
- [ ] Testing instructions do not expose credentials unless officially required

## After Submit

- [ ] Save Devpost confirmation screenshot or email
- [ ] Tag or record release identifier ([21-release-candidate-and-smoke-checklist.md](21-release-candidate-and-smoke-checklist.md))
- [ ] Monitor public demo through judging ([22-operations-runbook.md](22-operations-runbook.md))
- [ ] Do not change judged behavior without documenting a new release tag

## Entrant-Only (not in repository)

- Qwen Cloud API key and quota
- Alibaba Cloud account, ECS instance, TLS/domain
- Tax, identity, and prize verification data
- Final edited video and narration
