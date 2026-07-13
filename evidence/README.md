# Test Evidence

Redacted reports for hackathon judging and regression gates. **Never** store API keys, raw prompts, or private tenant data here.

**Judges:** start with [docs/27-judge-live-and-real-test-evidence.md](../docs/27-judge-live-and-real-test-evidence.md) (executed real/live suites, Mermaid, tables).

## Layout

| Path | Producer | Profile |
|---|---|---|
| `real/society-real-test.json` | `scripts/run-real-test.sh` | Deterministic golden `pricing-refactor` |
| `real/suite/*` | `scripts/run-real-test-suite.sh` | **Seven** domains + interaction traces |
| `real/evaluation-scenarios.json` | `scripts/generate_evaluation_evidence.py` | Seven-scenario baseline + ablation |
| `real/benchmark-summary.json` | same | Aggregate judge table |
| `live/suite/*` | `scripts/run-real-qwen-suite.sh` | **Live Qwen** — four domains (local) |
| `live/society-live-test.json` | same (checkout copy) or `run-live-test.sh` | Live Qwen golden / remote API |
| `live/judge-seven-scenarios/*` | `scripts/run-qwen-judge-seven-scenarios.sh` | **Live Qwen**, seven domains (in-process on society API) |
| `live/integrator-langgraph-qwen/*` | `scripts/run-langgraph-sdk-live-seven-scenarios.sh` | **LangGraph + SDK worker**, seven domains, all tickets external |

Full field reference: [docs/19-evidence-artifact-index.md](../docs/19-evidence-artifact-index.md).

## Regenerate (repository root)

```bash
bash hackathon/scripts/run-real-test-suite.sh
# or single golden path:
bash hackathon/scripts/run-real-test.sh
```

Live (entrant credentials required):

```bash
bash hackathon/scripts/run-real-qwen-suite.sh
bash hackathon/scripts/run-qwen-judge-seven-scenarios.sh
bash hackathon/scripts/run-langgraph-sdk-live-seven-scenarios.sh
# or deployed API:
export CHANGE_SOCIETY_LIVE_API_URL=https://your-api.example
bash hackathon/scripts/run-live-test.sh remote
```

## Git

`evidence/real/` is tracked for submission reproducibility. `evidence/live/` is **gitignored** by default — include it in a **private judge bundle** if you want live Qwen JSON without a public repo. Do not commit secrets.
