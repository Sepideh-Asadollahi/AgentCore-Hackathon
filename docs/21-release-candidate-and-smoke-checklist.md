# Release Candidate and Smoke Checklist

Phase 9 task **P9-02**. Run before feature freeze tag and again before Devpost submit. Record results in [12-phase-evidence-ledger.md](12-phase-evidence-ledger.md) or entrant release notes.

## Release Identifier

| Field | Value |
|---|---|
| Release tag / RC name | `{{RELEASE_TAG}}` |
| Commit SHA | `{{GIT_SHA}}` |
| Date (UTC) | `{{DATE}}` |
| Frozen scope reference | [../phases/09-release-demo-and-submission.md](../phases/09-release-demo-and-submission.md) |

## Clean Environment Install

From repository root (recommended):

```bash
bash hackathon/install.sh --profile verify
```

**Full 100% local smoke** (install paths + RC automated gates + Docker smoke compose + systemd):

```bash
bash hackathon/scripts/run-full-install-smoke.sh
```

See [../scripts/README.md](../scripts/README.md).

Manual equivalent:

```bash
python3 -m venv .venv
.venv/bin/pip install -r hackathon/backend/change-society-service/requirements.txt
cd hackathon/frontend && npm ci || npm install
```

## Automated Gates

| # | Check | Command | Pass? |
|---:|---|---|---|
| 1 | Backend unit/integration | `bash hackathon/scripts/run-pytest.sh -q` | [x] |
| 1b | Org policy intake slice | `bash hackathon/scripts/run-pytest.sh tests/backend/change-society-service/test_org_policy_intake.py -q` | [x] |
| 2 | Optional live Qwen | `QWEN_API_KEY=... pytest tests/backend/change-society-service/test_qwen_live.py` | [ ] entrant |
| 3 | Frontend types | `cd hackathon/frontend && npm run typecheck` | [ ] |
| 4 | Frontend production build | `cd hackathon/frontend && npm run build` | [ ] |
| 5 | Frontend unit tests | `node --experimental-strip-types --test tests/frontend/change-society/*.test.mjs` | [ ] |
| 6 | Deterministic society harness | `bash hackathon/scripts/run-real-test.sh` | [x] |
| 7 | Live production harness | `bash hackathon/scripts/run-live-test.sh remote` | [ ] entrant |

## Security Gates

| # | Check | Reference | Pass? |
|---:|---|---|---|
| 8 | No secrets in `git grep` for key patterns | [08-security.md](08-security.md) | [ ] |
| 9 | Production config rejects fake store | `CHANGE_SOCIETY_ENVIRONMENT=production` startup test | [ ] |
| 10 | Scoped headers required on API | ASGI contract test | [ ] |

## Public Smoke (entrant deployment)

| # | Check | Pass? |
|---:|---|---|
| 11 | `GET {{PUBLIC_API_URL}}/health` | [ ] |
| 12 | `GET {{PUBLIC_API_URL}}/ready` production ok | [ ] |
| 13 | Golden UI path: start → approve → completed | [ ] |
| 14 | Second session recall | [ ] |
| 15 | Baseline evaluate button | [ ] |

## Documentation Gates

| # | Document | Current? |
|---:|---|---|
| 16 | [SUBMISSION.md](../SUBMISSION.md) links valid | [x] |
| 17 | [15-devpost-field-guide-and-checklist.md](15-devpost-field-guide-and-checklist.md) placeholders filled | [ ] |
| 18 | [16-claim-evidence-mapping.md](16-claim-evidence-mapping.md) matches actual evidence | [ ] |
| 19 | Significant updates text matches commits | [ ] |

## Sign-Off

| Role | Name | Date |
|---|---|---|
| Engineering | | |
| Submission owner | | |

Only **critical** fixes allowed after sign-off per Phase 9 feature freeze.
