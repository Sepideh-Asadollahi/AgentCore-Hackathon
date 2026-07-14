# Test Evidence

Redacted reports for judging and regression. **Do not** store API keys, raw prompts, or tenant secrets here.

**Judges:** [docs/27-judge-live-and-real-test-evidence.md](../docs/27-judge-live-and-real-test-evidence.md).

## Layout

| Path | Producer | Profile |
|---|---|---|
| `real/society-real-test.json` | `../tests/e2e/change-society/run-real-test.sh` | Deterministic golden `pricing-refactor` |
| `real/suite/*` | `../tests/e2e/change-society/run-real-test-suite.sh` | Seven domains + interaction traces |
| `real/evaluation-scenarios.json` | `../tests/e2e/change-society/generate_evaluation_evidence.py` | Baseline + ablation |
| `real/benchmark-summary.json` | same | Aggregate table |
| `live/*` | live Qwen / integrator scripts | Requires `QWEN_API_KEY` in `.env` |

Field reference: [docs/19-evidence-artifact-index.md](../docs/19-evidence-artifact-index.md).

## Regenerate (repository root)

```bash
bash ../tests/e2e/change-society/run-real-test-suite.sh
bash ../tests/e2e/change-society/run-real-test.sh
```

Live Qwen (optional):

```bash
bash ../tests/live/change-society/run-real-qwen-suite.sh
bash ../tests/live/change-society/run-qwen-judge-seven-scenarios.sh
bash ../tests/live/change-society/run-langgraph-sdk-live-seven-scenarios.sh
export CHANGE_SOCIETY_LIVE_API_URL=https://your-api.example
bash ../tests/live/change-society/run-live-test.sh remote
```

## Git policy

`evidence/real/` is tracked for reproducible judging. `evidence/live/` is omitted from the default tree — generate locally when running live Qwen. Never commit secrets.
