# Demo and Live-Test Scripts

## Publish to public GitHub (entrant-local)

The script **`push-github-hackathon.local.sh`** is **gitignored** (personal clone path / confirm prompts). It rsyncs `hackathon/` to [AgentCore-Hackathon](https://github.com/Sepideh-Asadollahi/AgentCore-Hackathon) without `.env`, `node_modules`, or `evidence/live/`.

```bash
cp hackathon/scripts/push-github-hackathon.local.env.example hackathon/scripts/push-github-hackathon.local.env
# edit remote/branch if needed (no API keys in this file)
bash hackathon/scripts/push-github-hackathon.local.sh --dry-run
bash hackathon/scripts/push-github-hackathon.local.sh
```

API keys: copy `hackathon/.env.example` → `hackathon/.env` (also gitignored). The push script never uploads `.env`.

Excludes for publish are listed in **`publish-rsync-excludes.txt`** (e.g. `project_docs/`, `.pytest-last.txt`, evidence `*.log`, integrator scratch). **`LICENSE`** on the GitHub repo is preserved when syncing.

## Full install smoke (100% local gates)

From the repository root (isolated copy under `.smoke-temp/`, cleaned up unless `SMOKE_KEEP=1`):

```bash
bash hackathon/scripts/run-full-install-smoke.sh
```

Covers: interactive install menus (`production`, `verify`), release-candidate pytest/typecheck/build/frontend tests, `run-real-test-suite.sh`, install `--dry-run` matrix, optional dev PostgreSQL, **Docker** stack via `compose.smoke.yaml` (fake model, no Qwen calls), and **systemd** user units. Set `SMOKE_SKIP_DOCKER=1` or `SMOKE_SKIP_SYSTEMD=1` to skip runtime gates.

## Install

From the repository root:

```bash
bash hackathon/install.sh              # interactive on TTY: banner + menus with examples
bash hackathon/install.sh --profile verify
bash hackathon/install.sh --non-interactive --install-os-deps --runtime systemd
python3 hackathon/scripts/install.py --help
```

Core logic: `install.py` + `install_support/` package (venv, pip, npm, optional apt OS deps, optional Docker Postgres, runtime: manual | systemd | docker).

## Backend pytest

```bash
bash hackathon/scripts/run-pytest.sh -q
```

Sets `PYTHONPATH` and uses `python -m pytest` (works when the repo path changed after venv creation).

**Dependencies:** `pip install -r requirements-dev.txt` in the hackathon repo root (or run `bash install.sh`, which installs the same into `.venv`).

# Deterministic Real Workflow Test

`./run-real-test-suite.sh` (recommended) runs **four domain scenarios**, writes per-scenario reports and **agent interaction traces** under `hackathon/evidence/real/suite/`, regenerates the evaluation table, and refreshes `society-real-test.json`.

`./run-real-test.sh` runs the single golden-path `pricing-refactor` workflow only.

Documentation: [../docs/22-real-multi-domain-agent-tests.md](../docs/22-real-multi-domain-agent-tests.md).

`generate_evaluation_evidence.py` writes the three-scenario baseline comparison table to `hackathon/evidence/real/evaluation-scenarios.json`.

This proves application behavior but is not evidence of Qwen Cloud or Alibaba deployment.

## Live Qwen Test

`./run-real-qwen-suite.sh` runs the **four-scenario suite** locally with **live Qwen** (requires `hackathon/.env`). Writes `hackathon/evidence/live/suite/` (gitignored).

`./run-live-test.sh remote` tests an already deployed API using `CHANGE_SOCIETY_LIVE_API_URL`.

`./run-live-test.sh compose` builds and starts the production Compose profile locally with real Qwen and PostgreSQL, then runs the same evidence harness.

The live script refuses fake model or in-memory persistence. It never writes the API key to its report.

## Documentation

- Evidence field reference: [../docs/19-evidence-artifact-index.md](../docs/19-evidence-artifact-index.md)
- Release smoke gate: [../docs/21-release-candidate-and-smoke-checklist.md](../docs/21-release-candidate-and-smoke-checklist.md)

Server startup in scripts uses `.venv/bin/python -m uvicorn` (portable shebang). Manual start: [../docs/01-quickstart.md](../docs/01-quickstart.md).
