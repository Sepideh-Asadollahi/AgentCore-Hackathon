# Change Society — Qwen Cloud Hackathon Submission (Track 3)

**Track:** Track 3 — Agent Society  
**Official rules:** https://qwencloud-hackathon.devpost.com/rules  
**Competition overview:** https://qwencloud-hackathon.devpost.com/

**One-line thesis:** Change Society is a governed multi-agent decision system that turns ambiguous software changes into auditable, negotiated, human-approved decisions.

Entrant-owned URLs (public demo, video, final GitHub About link) live in [ENTRANT_SUBMISSION_URLS.example.md](ENTRANT_SUBMISSION_URLS.example.md). Copy to a private note and fill before Devpost submit.

---

## What judges should see (5-minute path)

1. **Track 3 self-check (API)** — after starting the API (see [docs/01-quickstart.md](docs/01-quickstart.md)):

   ```bash
   curl -sS http://127.0.0.1:32500/api/v1/hackathon/submission-compliance | jq .
   ```

2. **Deterministic society run (no API keys)** — from repository root:

   ```bash
   bash hackathon/scripts/run-real-test.sh
   ```

   Artifact: [evidence/real/society-real-test.json](evidence/real/society-real-test.json)

3. **Benchmark table (seven fixed scenarios)** — [evidence/real/benchmark-summary.json](evidence/real/benchmark-summary.json) and [docs/24-baseline-ablation-and-efficiency.md](docs/24-baseline-ablation-and-efficiency.md)

4. **Architecture (Mermaid on GitHub)** — [docs/02-architecture.md](docs/02-architecture.md)

5. **Alibaba Cloud proof (required repo file link for Devpost)** — [deployments/alibaba/deploy-ecs.sh](deployments/alibaba/deploy-ecs.sh) and [backend/change-society-service/src/change_society/infrastructure/alibaba_ecs.py](backend/change-society-service/src/change_society/infrastructure/alibaba_ecs.py)

6. **UI demo** — `bash install.sh` then open `http://localhost:32501` (cinematic mode). Negotiation panel: `frontend/components/NegotiationPanel.tsx`.

Full navigation: [docs/14-submission-pack-index.md](docs/14-submission-pack-index.md).

---

## Track 3 — Agent Society evidence in this repository

| Requirement | Implementation |
|---|---|
| Multiple agents with distinct capabilities | Managed-agent registry; six specialist roles + coordinator; see [docs/10-agent-control-plane-boundary.md](docs/10-agent-control-plane-boundary.md) |
| Task decomposition and routing | Durable `AgentTicket` lifecycle (created → assigned → claimed → in progress → review → completed) |
| Dialogue and negotiation | Universal Agent JSON v1; one bounded rebuttal round |
| Disagreement and conflict resolution | `ConflictRecord`, evidence-bound rebuttals, coordinator verdict |
| Measurable gain vs single-agent baseline | `evaluate-baseline`, four-way ablation, seven-scenario aggregate in `evidence/real/` |
| Qwen Cloud models | OpenAI-compatible adapter: `infrastructure/qwen_client.py`; CI uses deterministic `fake` provider |
| Human-in-the-loop | Fail-closed approval for high-risk paths; cross-session memory after approve |

Claim-to-proof table: [docs/16-claim-evidence-mapping.md](docs/16-claim-evidence-mapping.md).

**Metrics caveat (mandatory):** Fixed scenarios, deterministic profile, **n=1 per scenario** — not statistically significant. Do not claim production SLA or universal accuracy improvement. See caveat fields in JSON artifacts.

---

## Install and test (judges, clean clone)

From repository root:

```bash
bash install.sh --profile verify
```

Or manual gates:

```bash
bash hackathon/scripts/run-pytest.sh
cd hackathon/frontend && npm run typecheck && npm run build
node --experimental-strip-types --test tests/frontend/change-society/*.test.mjs
bash hackathon/scripts/run-real-test.sh
```

Live Qwen (entrant API key, optional): [docs/28-judge-seven-scenario-live-qwen-smoke.md](docs/28-judge-seven-scenario-live-qwen-smoke.md).  
LangGraph external worker (seven scenarios): [docs/29-langgraph-sdk-live-seven-scenarios.md](docs/29-langgraph-sdk-live-seven-scenarios.md).

---

## Open source and license

Apache License 2.0 at repository root: [../LICENSE](../LICENSE). The public GitHub repository must show this license in the About section (entrant configuration).

---

## Significant updates after May 26, 2026

English disclosure for Devpost: [docs/13-pre-hackathon-baseline-and-significant-updates.md](docs/13-pre-hackathon-baseline-and-significant-updates.md).

---

## Devpost checklist

[docs/15-devpost-field-guide-and-checklist.md](docs/15-devpost-field-guide-and-checklist.md) · [01-competition-rules-and-compliance.md](01-competition-rules-and-compliance.md)

---

## Primary demo scenario

Golden path: **`checkout-api-refactor`** — refactor vs contract-breaking API change, specialist conflict, rebuttal, human approval. Pitch copy: [docs/25-pitch-and-demo-focus.md](docs/25-pitch-and-demo-focus.md). Video storyboard: [docs/17-video-storyboard-and-recording-guide.md](docs/17-video-storyboard-and-recording-guide.md).
