# Evidence Artifact Index

Redacted JSON reports under `hackathon/evidence/`. No API keys, prompts, or PII. Regenerate after behavioral changes.

**Judge quick read:** [27-judge-live-and-real-test-evidence.md](27-judge-live-and-real-test-evidence.md) — executed deterministic (7 scenarios), live Qwen, and LangGraph + SDK integrator suites with Mermaid diagrams.

## Directory Layout

```
hackathon/evidence/
├── README.md
├── real/          # Deterministic model + in-memory store
│   ├── society-real-test.json
│   ├── evaluation-scenarios.json
│   ├── benchmark-summary.json
│   └── suite/     # Seven-domain manifests + interaction traces
│       ├── manifest.json
│       ├── <scenario>.json
│       └── <scenario>-interaction-trace.json
└── live/          # Production-shaped (Qwen + PostgreSQL) and judge live runs
    ├── society-live-test.json
    ├── judge-seven-scenarios/     # run-qwen-judge-seven-scenarios.sh
    └── integrator-langgraph-qwen/ # run-langgraph-sdk-live-seven-scenarios.sh
```

Root `.gitignore` excludes generic `evidence/` and **`hackathon/evidence/live/`** (production-shaped runs). **Tracked** for submission: `hackathon/evidence/real/*.json` only.

## Artifacts

### `real/society-real-test.json`

| Field | Meaning |
|---|---|
| `status` | `passed` when harness succeeds |
| `test_family` | `real_deterministic` |
| `run_id` | Society run exercised end-to-end |
| `roles` | Distinct sender roles observed |
| `readiness` | `/ready` snapshot (degraded expected for fake profile) |
| `tickets`, `messages`, `conflicts` | Counts and lifecycle checks |

**Producer:** `bash hackathon/scripts/run-real-test-suite.sh` (full suite) or `bash hackathon/scripts/run-real-test.sh` (pricing only)  
**Documentation:** [22-real-multi-domain-agent-tests.md](22-real-multi-domain-agent-tests.md)

### `real/suite/manifest.json` and traces

| Field | Meaning |
|---|---|
| `scenarios[]` | One row per domain (`pricing-refactor`, `password-migration`, `payment-memory`, `checkout-api-refactor`) |
| `interaction_trace_path` | Redacted Universal Agent JSON timeline (role, capability, ticket, evidence refs) |
| `rebuttal_response_count` | Negotiation evidence where applicable |

**Producer:** `bash hackathon/scripts/run-real-test-suite.sh`

### `real/evaluation-scenarios.json`

| Field | Meaning |
|---|---|
| `scenarios[]` | One entry per fixed scenario ID (seven) |
| `society_metrics` / `baseline_metrics` | Recall, tasks, tokens |
| `ablation` | Four counterfactual variants per scenario |
| `aggregate` | Cross-scenario averages (also in `benchmark-summary.json`) |
| `tradeoffs` | Deltas for submission table |
| `caveat` | Non-statistical disclaimer |

### `real/benchmark-summary.json`

| Field | Meaning |
|---|---|
| `aggregate_table` | Judge-facing single-agent vs society averages |
| `ablation_critical_impact_recall_avg` | Mean recall per ablation variant |

**Producer:** `hackathon/scripts/generate_evaluation_evidence.py`

### `live/suite/manifest.json` and `live/society-live-test.json`

| Field | Meaning |
|---|---|
| `verification_profile` | `live-qwen` when produced by `run-real-qwen-suite.sh` |
| `executed_at` | UTC timestamp of last local live suite |
| `scenarios[]` | Four domains in default live suite (pricing, password, payment, checkout) |
| `society-live-test.json` | Copy of **checkout-api-refactor** live report (primary demo) |

**Producer:** `bash hackathon/scripts/run-real-qwen-suite.sh`  
**Documentation:** [27-judge-live-and-real-test-evidence.md](27-judge-live-and-real-test-evidence.md)

### `live/society-live-test.json` (remote deploy)

Same schema family as real test with `test_family: live` and `--expect-production` checks (`/ready` status `ok`, Qwen + PostgreSQL).

**Producer:** `bash hackathon/scripts/run-live-test.sh remote|compose`  
**Gate:** Phase 1 live Qwen; Phase 8 Alibaba/public demo  
**Owner:** Entrant (requires credentials)  
**Git:** directory gitignored; only redacted excerpts belong in public submission material.

### `live/judge-seven-scenarios/judge-summary.json`

| Field | Meaning |
|---|---|
| `scenarios[]` | Seven benchmark IDs with pass/fail |
| `readiness.provider` | Typically `qwen_cloud` |

**Producer:** `bash hackathon/scripts/run-qwen-judge-seven-scenarios.sh`  
**Documentation:** [28-judge-seven-scenario-live-qwen-smoke.md](28-judge-seven-scenario-live-qwen-smoke.md)

### `live/integrator-langgraph-qwen/langgraph-sdk-judge-summary.json`

| Field | Meaning |
|---|---|
| `scenarios[]` | Seven benchmark IDs; each row should show external worker runtime |
| `verification_profile` | `integrator-live-all` |
| Per-scenario reports | `langgraph_integrator.all_ticket_runtimes` in `<scenario>.json` |

**Producer:** `bash hackathon/scripts/run-langgraph-sdk-live-seven-scenarios.sh`  
**Documentation:** [29-langgraph-sdk-live-seven-scenarios.md](29-langgraph-sdk-live-seven-scenarios.md)

## Related Test Outputs (not committed)

| Output | Command |
|---|---|
| Pytest junit/xml | CI optional |
| `/tmp/change-society-real-test.log` | uvicorn log during real test |

## Claim Linkage

See [16-claim-evidence-mapping.md](16-claim-evidence-mapping.md) for which Devpost claims each artifact supports.

## Regeneration Commands

From repository root:

```bash
# Deterministic (no secrets)
bash hackathon/scripts/run-real-test.sh

# Evaluation table only
.venv/bin/python hackathon/scripts/generate_evaluation_evidence.py

# Live (entrant)
export CHANGE_SOCIETY_LIVE_API_URL=https://{{YOUR_API}}
bash hackathon/scripts/run-live-test.sh remote
```

Use `.venv/bin/python -m uvicorn` for manual server start ([01-quickstart.md](01-quickstart.md)).
