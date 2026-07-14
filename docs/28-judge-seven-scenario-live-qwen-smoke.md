# Judge live demo — seven scenarios (real Qwen model agents)

English one-pager for **Track 3 judges**: prove all benchmark domains with **live Qwen** calls through managed **model** adapters (real agents in-process—not the deterministic fake profile, not LangGraph unless you run the integrator suite separately).

**LangGraph integrator path (optional):** [29-langgraph-sdk-live-seven-scenarios.md](29-langgraph-sdk-live-seven-scenarios.md).

## One command

From repository root (requires `QWEN_API_KEY` in `hackathon/.env`):

```bash
bash tests/live/change-society/run-judge-seven-scenarios.sh
```

Same as `run-qwen-judge-seven-scenarios.sh`. Profile **`judge-live`**: short `judge_demo_request` per scenario, skips cross-session follow-up, asserts `qwen_cloud` + `ModelAgentAdapter` ticket runtimes.

## What it does

```mermaid
flowchart LR
  SH[tests/live/change-society/run-qwen-judge-seven-scenarios.sh]
  API[change-society-service + QwenCloudClient]
  QW[Qwen compatible-mode API]
  EV[judge-seven-scenarios/]

  SH --> API
  API --> QW
  SH --> EV
```

| Step | Real? |
|------|--------|
| Start local API with `CHANGE_SOCIETY_MODEL_PROVIDER=qwen` | Yes |
| For **each of 7** scenario IDs: create run → tickets → negotiation → approve → baseline | Yes |
| Each specialist call hits **Qwen HTTP API** via **ModelAgentAdapter** | Yes |
| Short judge request text per scenario (`judge_demo_request`) | Yes |
| Skip cross-session follow-up (saves tokens; core workflow unchanged) | Config |

## Seven scenarios

Same IDs as deterministic benchmark (`evidence/real/suite/`):

1. `pricing-refactor`
2. `password-migration`
3. `payment-memory`
4. `checkout-api-refactor` (primary video demo)
5. `hr-compensation-export`
6. `gdpr-erasure-automation`
7. `vendor-access-offboarding`

## Evidence (show judges)

| File | Purpose |
|------|---------|
| `evidence/live/judge-seven-scenarios/judge-summary.json` | **Start here** — pass/fail table |
| `evidence/live/judge-seven-scenarios/manifest.json` | Full index + readiness (`qwen_cloud`) |
| `evidence/live/judge-seven-scenarios/<scenario>.json` | Per-run verify report |
| `evidence/live/judge-seven-scenarios/<scenario>-interaction-trace.json` | Redacted Universal Agent JSON timeline |

Also updates `evidence/live/society-live-test.json` from checkout scenario.

## Tuning (optional env)

| Variable | Default | Notes |
|----------|---------|--------|
| `QWEN_JUDGE_MODEL` | `qwen-flash` | Free/cheap tier friendly |
| `CHANGE_SOCIETY_JUDGE_RUN_TOKEN_BUDGET` | `80000` | Per society run cap (shorter judge smoke) |
| `CHANGE_SOCIETY_JUDGE_ROLE_TOOLS` | `0` | Faster smoke; set `1` for tool-loop demo |
| `CHANGE_SOCIETY_JUDGE_SUITE_PORT` | `32504` | Local API port |

## Related

- [29-langgraph-sdk-live-seven-scenarios.md](29-langgraph-sdk-live-seven-scenarios.md) — **LangGraph + SDK**, seven scenarios, external worker (integrator demo)
- [27-judge-live-and-real-test-evidence.md](27-judge-live-and-real-test-evidence.md)
- [03-qwen-cloud-integration.md](03-qwen-cloud-integration.md)
- Deterministic regression: `bash tests/e2e/change-society/run-real-test-suite.sh` (no API key)
