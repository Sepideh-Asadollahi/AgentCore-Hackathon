# Submission Pack Index (AgentCore)

Central navigation for Qwen Cloud hackathon **Track 3** submission readiness for **AgentCore** (primary demo: **Change Society**). All formal text is English. Secrets never belong in these documents.

## Before you submit

1. Complete [15-devpost-field-guide-and-checklist.md](15-devpost-field-guide-and-checklist.md).
2. Run [21-release-candidate-and-smoke-checklist.md](21-release-candidate-and-smoke-checklist.md).
3. Map every public claim to [16-claim-evidence-mapping.md](16-claim-evidence-mapping.md).
4. Record video using [17-video-storyboard-and-recording-guide.md](17-video-storyboard-and-recording-guide.md).
5. Publish blog draft from [18-blog-post-outline.md](18-blog-post-outline.md) (Blog Post Award).
6. Paste significant-update text from [13-pre-hackathon-baseline-and-significant-updates.md](13-pre-hackathon-baseline-and-significant-updates.md).

## Document Map

### Engineering (`docs/`)

| Doc | Purpose |
|---|---|
| [01-quickstart.md](01-quickstart.md) | Local and production-shaped setup |
| [02-architecture.md](02-architecture.md) | Mermaid runtime and module diagrams |
| [03-qwen-cloud-integration.md](03-qwen-cloud-integration.md) | Qwen adapter and budgets |
| [04-protocol-and-sdk.md](04-protocol-and-sdk.md) | Universal Agent JSON and clients |
| [06-testing-and-evaluation.md](06-testing-and-evaluation.md) | Test commands and evaluation scripts |
| [27-judge-live-and-real-test-evidence.md](27-judge-live-and-real-test-evidence.md) | **Executed real/live E2E evidence for judges (Mermaid + tables)** |
| [24-baseline-ablation-and-efficiency.md](24-baseline-ablation-and-efficiency.md) | Metrics methodology and ablation |
| [25-pitch-and-demo-focus.md](25-pitch-and-demo-focus.md) | Devpost thesis and primary demo scenario |
| [26-external-agent-integrator-guide.md](26-external-agent-integrator-guide.md) | LangGraph/webhook/SDK integrator guide + E2E script |
| [28-judge-seven-scenario-live-qwen-smoke.md](28-judge-seven-scenario-live-qwen-smoke.md) | Seven scenarios, live Qwen in-process (one command) |
| [29-langgraph-sdk-live-seven-scenarios.md](29-langgraph-sdk-live-seven-scenarios.md) | **LangGraph + SDK**, seven scenarios, external worker proof |
| [07-deployment-and-operations.md](07-deployment-and-operations.md) | Compose, Alibaba, monitoring |
| [08-security.md](08-security.md) | Security boundaries |
| [09-phase-traceability.md](09-phase-traceability.md) | Phase-to-code traceability |
| [12-phase-evidence-ledger.md](12-phase-evidence-ledger.md) | Phase status and artifact paths |
| [13-pre-hackathon-baseline-and-significant-updates.md](13-pre-hackathon-baseline-and-significant-updates.md) | May 26 baseline and Devpost disclosure |

### Submission artifacts (this pack)

| Doc | Purpose |
|---|---|
| [15-devpost-field-guide-and-checklist.md](15-devpost-field-guide-and-checklist.md) | Devpost fields and link verification |
| [16-claim-evidence-mapping.md](16-claim-evidence-mapping.md) | Judging claims → proof |
| [17-video-storyboard-and-recording-guide.md](17-video-storyboard-and-recording-guide.md) | Sub-3-minute video shot list |
| [18-blog-post-outline.md](18-blog-post-outline.md) | Blog Post Award structure |
| [19-evidence-artifact-index.md](19-evidence-artifact-index.md) | Generated and live evidence files |
| [27-judge-live-and-real-test-evidence.md](27-judge-live-and-real-test-evidence.md) | Executed real/live E2E report for judges |
| [20-third-party-license-and-media-inventory.md](20-third-party-license-and-media-inventory.md) | Dependencies and media rights |
| [21-release-candidate-and-smoke-checklist.md](21-release-candidate-and-smoke-checklist.md) | P9-02 release gate |

## Required Public Artifacts (Phase 9)

| Artifact | Where documented | Owner |
|---|---|---|
| Open-source repo + LICENSE | Repository root | Implemented |
| Setup and test instructions | [01-quickstart.md](01-quickstart.md), [06-testing-and-evaluation.md](06-testing-and-evaluation.md) | Implemented |
| Architecture diagram | [02-architecture.md](02-architecture.md) | Implemented |
| Alibaba Cloud proof file link | [../deployments/alibaba/deploy-ecs.sh](../deployments/alibaba/deploy-ecs.sh) | Template implemented; **live deploy URL entrant** |
| Working demo | UI + API or public URL | **Public URL entrant** |
| English description | [15-devpost-field-guide-and-checklist.md](15-devpost-field-guide-and-checklist.md) | Template + entrant fill-in |
| Video ≤ 3 minutes | [17-video-storyboard-and-recording-guide.md](17-video-storyboard-and-recording-guide.md) | **Entrant** |
| Track 3 selection | Devpost form | **Entrant** |
| Blog link (optional award) | [18-blog-post-outline.md](18-blog-post-outline.md) | **Entrant** |

## Regenerate Evidence

From repository root:

```bash
bash ../tests/e2e/change-society/run-real-test-suite.sh
bash ../tests/e2e/change-society/run-real-test.sh
bash ../tests/live/change-society/run-real-qwen-suite.sh   # live Qwen → evidence/live/
bash ../tests/live/change-society/run-judge-seven-scenarios.sh   # 7 scenarios, real Qwen model agents (canonical)
bash ../tests/live/change-society/run-qwen-judge-seven-scenarios.sh   # same harness
bash ../tests/live/change-society/run-langgraph-sdk-live-seven-scenarios.sh   # 7 scenarios, LangGraph worker + SDK
```

See [19-evidence-artifact-index.md](19-evidence-artifact-index.md) and [27-judge-live-and-real-test-evidence.md](27-judge-live-and-real-test-evidence.md).
