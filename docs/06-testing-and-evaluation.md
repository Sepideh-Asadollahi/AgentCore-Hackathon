# Testing and Evaluation

The backend suite verifies Universal Agent JSON translation, LangChain/LangGraph `invoke` bridging without framework coupling, signed webhook verification, managed-agent registration, and the full AgentTicket lifecycle in addition to society negotiation and API contracts.

The deterministic suite covers domain policy, role diversity, message contracts, conflict creation, exactly one rebuttal round, Qwen Judge mapping, approval versioning, idempotency, isolation, cross-session memory, API errors, OpenAPI IDs, Qwen adapter parsing, **baseline metrics**, **ablation counterfactuals**, and **org policy intake** (guided narrative → challenges → `org_policy_*` evidence).

```bash
bash install.sh --profile verify   # install + deterministic society proof

PYTHONPATH=backend/change-society-service/src:sdk/python .venv/bin/python -m pytest tests/backend/change-society-service -q
PYTHONPATH=backend/change-society-service/src:sdk/python .venv/bin/python -m pytest tests/backend/change-society-service/test_org_policy_intake.py -q
cd frontend && npm run typecheck && npm run build
node --experimental-strip-types --test tests/frontend/change-society/*.test.mjs
```

## Org policy intake tests

| Layer | File | What it proves |
| --- | --- | --- |
| Heuristics | `test_org_policy_intake.py` | Tag inference, `catalog_only` skip, candidate building |
| Provider | `test_org_policy_intake.py` | Session lifecycle, `retrieve()` merges `org_policy_*`, scope isolation |
| Service | `test_org_policy_intake.py` | `ChangeSocietyService` façade, society run after activation |
| HTTP (ASGI) | `test_org_policy_intake.py` | Analyze, resolve, activate, list, 404/400 paths |
| Frontend helpers | `tests/frontend/change-society/org-policy-intake.test.mjs` | Pending challenge + adopt list helpers |

Design reference: [30-org-policy-intake-slice.md](30-org-policy-intake-slice.md).

## Benchmark and ablation evidence

**Seven** fixed scenarios compare Change Society with a single generic agent and report ablation variants (no negotiation, no Policy Guardian, full society).

| Command / artifact | Purpose |
|---|---|
| `python scripts/generate_evaluation_evidence.py` | Writes `evidence/real/evaluation-scenarios.json` and `benchmark-summary.json` |
| `POST .../society-runs:evaluate-all-scenarios` | Same metrics via API + `aggregate` block |
| `POST .../society-runs/{id}:evaluate-baseline` | Per-run comparison + `ablation` |

Full methodology, efficiency framing, and safe public wording: **[24-baseline-ablation-and-efficiency.md](24-baseline-ablation-and-efficiency.md)**.

Report raw impact/policy/task recall, unsupported claims, tokens, and latency. The sample is demonstrative until repeated live Qwen runs are captured; higher society token cost must remain visible.

**Judge-facing summary of executed real/live runs (Mermaid + tables):** [27-judge-live-and-real-test-evidence.md](27-judge-live-and-real-test-evidence.md).

**Seven scenarios, live Qwen in-process (society service):** [28-judge-seven-scenario-live-qwen-smoke.md](28-judge-seven-scenario-live-qwen-smoke.md).

**Seven scenarios, LangGraph + SDK external worker (integrator demo):** [29-langgraph-sdk-live-seven-scenarios.md](29-langgraph-sdk-live-seven-scenarios.md) — `bash scripts/run-langgraph-sdk-live-seven-scenarios.sh`.

## External agent integrator (LangGraph / webhook)

Reference worker: [../examples/external-change-analyst-worker/README.md](../examples/external-change-analyst-worker/README.md). Testing detail: [../examples/external-change-analyst-worker/docs/TESTING.md](../examples/external-change-analyst-worker/docs/TESTING.md). Integrator guide: [26-external-agent-integrator-guide.md](26-external-agent-integrator-guide.md).

| Command | Scope |
|---------|--------|
| `bash scripts/run-integrator-unit-tests.sh` | Graph, executor, HTTP, webhook bridge, registry JSON (`pytest -k integrator`) |
| `bash examples/external-change-analyst-worker/scripts/smoke_worker.sh` | Worker package contract tests only |
| `bash scripts/run-integrator-e2e.sh` | Worker + society API + `checkout-api-refactor` |
| `bash scripts/run-integrator-live-test.sh` | Live Qwen on external worker (one or seven scenarios) |
| `bash scripts/run-langgraph-sdk-live-seven-scenarios.sh` | **Seven scenarios**, all roles webhook, judge summary JSON |

Unit tests live under `tests/backend/change-society-service/test_integrator_*.py` and import the example worker via `integrator_worker_support.py` (no duplicate business logic).

## Combined Evidence Scripts

Run `scripts/run-real-test-suite.sh` for deterministic multi-domain proof. Run `scripts/run-live-test.sh remote` against Alibaba, or `compose` for a local production-shaped Qwen/PostgreSQL stack.

Artifact index: [19-evidence-artifact-index.md](19-evidence-artifact-index.md). Release gate: [21-release-candidate-and-smoke-checklist.md](21-release-candidate-and-smoke-checklist.md). Demo focus: [25-pitch-and-demo-focus.md](25-pitch-and-demo-focus.md).
