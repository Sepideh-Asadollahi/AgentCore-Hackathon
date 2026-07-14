# Demo and Live-Test Scripts

Run from the **pack root** (directory with `install.sh`). Canonical runners live under `tests/`; `hackathon/scripts/run-*.sh` delegates there for backward compatibility.

## Install

```bash
bash install.sh
bash install.sh --profile verify
bash install.sh --non-interactive --install-os-deps --runtime systemd
python3 scripts/install.py --help
```

Core logic: `install.py` + `install_support/` (venv, pip, npm, optional OS packages, Docker Postgres, runtime: manual | systemd | docker).

## Backend pytest

```bash
bash scripts/run-pytest.sh -q
# or: bash ../tests/backend/change-society-service/run-pytest.sh -q
```

Sets `PYTHONPATH` and uses `.venv/bin/python -m pytest`.

## Frontend unit tests

```bash
bash scripts/run-frontend-tests.sh
```

Uses Node’s built-in test runner with `--experimental-strip-types` against `tests/frontend/change-society/` (pack root or parent tree).

From `frontend/`: `npm test`.

## Deterministic workflow tests (e2e)

```bash
bash scripts/run-real-test-suite.sh   # seven domains + traces under evidence/real/suite/
bash scripts/run-real-test.sh         # golden pricing-refactor path only
```

Canonical path: `tests/e2e/change-society/`. See [docs/22-real-multi-domain-agent-tests.md](../docs/22-real-multi-domain-agent-tests.md).

`tests/e2e/change-society/generate_evaluation_evidence.py` refreshes `evidence/real/evaluation-scenarios.json` and `benchmark-summary.json`.

## Live Qwen (requires `.env` with `QWEN_API_KEY`)

```bash
bash scripts/run-real-qwen-suite.sh
bash scripts/run-qwen-judge-seven-scenarios.sh
bash scripts/run-langgraph-sdk-live-seven-scenarios.sh
export CHANGE_SOCIETY_LIVE_API_URL=https://your-api.example
bash scripts/run-live-test.sh remote
```

Canonical path: `tests/live/change-society/`. Live output under `evidence/live/` (not committed — see [evidence/README.md](../evidence/README.md)).

## Full install smoke

```bash
bash scripts/run-full-install-smoke.sh
```

## Documentation

- [docs/19-evidence-artifact-index.md](../docs/19-evidence-artifact-index.md)
- [docs/21-release-candidate-and-smoke-checklist.md](../docs/21-release-candidate-and-smoke-checklist.md)
- [docs/01-quickstart.md](../docs/01-quickstart.md)
