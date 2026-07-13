# Quickstart

Judges: see [SUBMISSION.md](../SUBMISSION.md) for the fast review path.

## One-Command Install (recommended for judges and demo)

From the **repository root** (the folder that contains `install.sh` and `hackathon/`):

```bash
bash install.sh
```

Same installer:

```bash
bash hackathon/install.sh
```

Options:

```bash
bash install.sh --profile demo          # default: venv, backend deps, frontend npm, demo .env
bash install.sh --profile verify        # demo install + deterministic end-to-end test
bash install.sh --profile production    # print Qwen/PostgreSQL/Alibaba hints only
bash install.sh --dry-run               # show steps without changing the machine
bash install.sh --skip-frontend         # backend only (no Node/npm)
bash install.sh --non-interactive --install-os-deps   # Debian/Ubuntu: apt for venv, node, docker
bash install.sh --runtime systemd --install-os-deps   # user systemd units for API + UI
bash install.sh --runtime docker        # full Docker Compose (needs QWEN + DB password in .env)
bash install.sh --with-postgres         # optional dev PostgreSQL container (Docker)
```

On an **interactive terminal**, `bash install.sh` shows an ASCII banner and numbered menus; each choice includes a concrete example (manual terminals, `systemctl --user`, or `docker compose`).

The installer is Python-first (`hackathon/scripts/install.py` + `install_support/`); `install.sh` at the repo root is a thin wrapper. It creates `.venv` at the repo root, installs from **`hackathon/requirements.txt`** (or `backend/change-society-service/requirements.txt` if the aggregate file is missing), optionally **`hackathon/requirements-dev.txt`** for pytest, runs `npm ci` in `hackathon/frontend` (required unless `--skip-frontend`), can install OS packages on Debian/Ubuntu with `--install-os-deps`, and writes `hackathon/.env` with a **safe demo profile** (`fake` model + in-memory store) if that file is missing.

**Standalone hackathon clone** (repository root = published `hackathon/` tree): use `requirements.txt` and `requirements-dev.txt` at that root with the same `.venv` commands as in [../README.md](../README.md).

## Local Demonstration Without External Services

Run from the **repository root** (`AgentCore/`).

1. Install (above) or copy `hackathon/.env.example` and switch to a safe local profile manually.
2. Export variables from `hackathon/.env` in your shell.
3. Start the backend:

```bash
PYTHONPATH=hackathon/backend/change-society-service/src .venv/bin/python -m uvicorn change_society.main:app --port 32500
```

4. In `hackathon/frontend`, run `npm install` and `npm run dev`.
5. Open `http://localhost:32501`.

**Cinematic demo (default):** the UI opens in guided mode with animated beats (change request → tickets → Universal Agent JSON → conflict → human approval → metrics). Use **Inspector mode** for full ticket/message JSON. Keyboard: `←` / `→` change beat, `Esc` exits cinematic mode. See [frontend/README.md](../frontend/README.md).

The safe local profile uses a deterministic model and memory repository. `/ready` deliberately reports it as degraded and not production-ready.

## Real Qwen and PostgreSQL Profile

Set `CHANGE_SOCIETY_MODEL_PROVIDER=qwen`, `QWEN_API_KEY`, `CHANGE_SOCIETY_STORE=postgresql`, and `CHANGE_SOCIETY_DATABASE_URL`. Apply migrations `0001_change_society.sql` and `0002_agent_control_plane.sql`, then start the service. `config/managed-agents.json` defines the demo worker registry; an alternate path can be supplied with `CHANGE_SOCIETY_MANAGED_AGENTS_CONFIG`. Production startup rejects fake model and memory store configurations.

## Verification

```bash
bash hackathon/scripts/run-pytest.sh -q
cd hackathon/frontend && npm run typecheck
node --experimental-strip-types --test tests/frontend/change-society/demo-state.test.mjs
bash hackathon/scripts/run-real-test.sh
```

Evidence files: [19-evidence-artifact-index.md](19-evidence-artifact-index.md).

On CPUs that cannot load the native Next.js SWC binary, use the WASM/Webpack command in [06-testing-and-evaluation.md](06-testing-and-evaluation.md).
