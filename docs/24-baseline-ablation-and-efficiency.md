# Baseline, Ablation, and Efficiency Benchmarks

Judge-facing reference for **measurable** Track 3 comparisons. The video demo uses one primary scenario; this document holds the **numeric** proof.

## Core pitch (English, for Devpost)

> **Change Society is a governed multi-agent decision system that turns ambiguous software changes into auditable, negotiated, human-approved decisions.**

The architecture is validated across **seven fixed scenarios** spanning billing, security, payments, API engineering, HR, privacy/GDPR, and HR–security offboarding—not seven separate products.

## Artifacts

| File | Contents |
|---|---|
| `hackathon/evidence/real/evaluation-scenarios.json` | Per-scenario society vs single-agent metrics, ablation variants, efficiency |
| `hackathon/evidence/real/benchmark-summary.json` | Aggregated tables across all seven scenarios |
| `POST .../society-runs/{run_id}:evaluate-baseline` | Same comparison for one live run |
| `POST .../society-runs:evaluate-all-scenarios` | Full suite + `aggregate` block |

Regenerate deterministic evidence:

```bash
PYTHONPATH=hackathon/backend/change-society-service/src \
  .venv/bin/python tests/e2e/change-society/generate_evaluation_evidence.py
```

## Methodology (fair comparison)

Use the **same**:

- Qwen model deployment (or deterministic profile for CI);
- evidence retrieval budget and exclusion rules (stale, restricted);
- scenario request text;
- JSON schema family (`RoleOutput` / baseline schema);
- fixed temperature and retry policy from config.

Run **multiple repetitions per scenario** before claiming statistical significance. The repository ships **n=1 per scenario** on the deterministic profile with an explicit caveat.

### Metrics defined

| Metric | Meaning |
|---|---|
| `critical_impact_recall` | Fraction of scenario `expected_impacts` detected in structured output |
| `policy_match_recall` | Fraction of `required_policies` tags identified |
| `task_completeness` | Fraction of `required_tasks` present |
| `unsupported_claim_count` | Findings without evidence refs (proxy for false unsupported claims) |
| Stale-memory errors | Count of `excluded_evidence` with reason `not_current` (society should prefer current sources) |
| Tokens / latency | Reported separately; society is expected to cost more |

### Efficiency (not raw speed)

Recall alone is not efficiency. Report:

- **Critical-risk recall per 10K tokens** (society vs baseline) — in each evaluation’s `ablation.efficiency`;
- **Human review steps avoided** — proxied by `required_approvers_identified` and approval gate;
- **False-negative reduction** — `impact_recall_delta` and raw `impact_found/impact_total`;
- **Token delta** — must remain visible (tradeoff disclosure).

## Aggregate table (deterministic profile)

After `tests/e2e/change-society/generate_evaluation_evidence.py`, use `benchmark-summary.json` (committed snapshot):

| Metric | Single agent (avg) | Change Society (avg) | Raw impacts | Raw policies |
|---:|---:|---:|---|---|
| Critical impact recall | 0.27 | 0.96 | 25/26 | — |
| Policy match recall | 0.0 | 1.0 | — | 10/10 vs 0/10 |
| Task completeness | 0.33 | 1.0 | — | — |
| Avg tokens | 200 | 1400 | — | — |

**Do not invent percentages in the video**—re-read JSON after regeneration or use the UI baseline button on a live run.

On the **deterministic fake model**, ablation **impact** recall may tie between “without negotiation” and “full society” because the first Change Analyst payload already lists expected impacts; the clearest ablation gap is **without Policy Guardian** (policy recall → 0). Live Qwen repetitions may show wider negotiation separation—store under `evidence/live/`.

## Ablation (four variants)

Each baseline evaluation includes `ablation.variants`:

1. **Single agent** — one generic reviewer (`single_agent_baseline` role).
2. **Multi-agent without negotiation** — re-score pre-rebuttal specialist payloads.
3. **Multi-agent without Policy Guardian** — Change + Impact only (policy recall drops).
4. **Full Change Society** — measured run metrics.

Interpretation for judges:

- If **without Policy Guardian** loses policy recall, the policy role is not decorative.
- If **without negotiation** underperforms full society on tasks or reconciled risk, rebuttal adds value.
- Implementation: `change_society/application/ablation.py`.

## Live Qwen replication checklist

1. Set `CHANGE_SOCIETY_MODEL_PROVIDER=qwen` and credentials per [03-qwen-cloud-integration.md](03-qwen-cloud-integration.md).
2. Run each benchmark scenario ≥3 times; record median recall and token totals.
3. Store redacted reports under `hackathon/evidence/live/` (gitignored) for your submission pack.
4. Keep deterministic JSON in-repo as reproducible CI proof.

## Safe public wording

- Allowed: “On fixed scenario X, society impact recall was A vs baseline B (deterministic profile, n=1).”
- Not allowed: “Always 88% better in production” without sample size and environment.

Related: [06-testing-and-evaluation.md](06-testing-and-evaluation.md), [16-claim-evidence-mapping.md](16-claim-evidence-mapping.md), [25-pitch-and-demo-focus.md](25-pitch-and-demo-focus.md).
