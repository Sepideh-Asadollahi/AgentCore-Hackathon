# Quickstart

Judges: see [14-submission-pack-index.md](14-submission-pack-index.md) for the fast review path.

## One-command install

From the **repository root** (folder that contains `install.sh`, `backend/`, `frontend/`):

```bash
bash install.sh
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

On an **interactive terminal**, `bash install.sh` shows an ASCII banner and numbered menus.

The installer is Python-first (`scripts/install.py` + `install_support/`). It creates `.venv` at the repo root, installs from **`requirements.txt`** (or `backend/change-society-service/requirements.txt` if missing), optionally **`requirements-dev.txt`** for pytest, runs `npm ci` in `frontend` (unless `--skip-frontend`), can install OS packages on Debian/Ubuntu with `--install-os-deps`, and writes `.env` with a **safe demo profile** (`fake` model + in-memory store) when that file is missing.

## Local demonstration without external services

1. Install (above) or copy `.env.example` → `.env` with a safe local profile.
2. Export variables from `.env` in your shell.
3. Start the backend:

```bash
PYTHONPATH=backend/change-society-service/src .venv/bin/python -m uvicorn change_society.main:app --port 32500
```

4. In `frontend/`, run `npm install` and `npm run dev`.
5. Open `http://localhost:3000`.

**Cinematic demo (default):** guided mode with animated beats (change request → tickets → Universal Agent JSON → conflict → human approval → metrics). Use **Inspector mode** for full ticket/message JSON. Keyboard: `←` / `→` change beat, `Esc` exits cinematic mode. See [frontend/README.md](../frontend/README.md).

The safe local profile uses a deterministic model and memory repository. `/ready` deliberately reports degraded / not production-ready.

## Real Qwen and PostgreSQL profile

Set `CHANGE_SOCIETY_MODEL_PROVIDER=qwen`, `QWEN_API_KEY`, `CHANGE_SOCIETY_STORE=postgresql`, and `CHANGE_SOCIETY_DATABASE_URL`. Apply migrations `0001_change_society.sql` and `0002_agent_control_plane.sql`, then start the service. `config/managed-agents.json` defines the demo worker registry; override with `CHANGE_SOCIETY_MANAGED_AGENTS_CONFIG`. Production startup rejects fake model and memory store configurations.

## Verification

```bash
bash ../tests/backend/change-society-service/run-pytest.sh -q
cd frontend && npm run typecheck
node --experimental-strip-types --test tests/frontend/change-society/demo-state.test.mjs
bash ../tests/e2e/change-society/run-real-test.sh
```

Evidence files: [19-evidence-artifact-index.md](19-evidence-artifact-index.md).

On CPUs that cannot load the native Next.js SWC binary, use the WASM/Webpack command in [06-testing-and-evaluation.md](06-testing-and-evaluation.md).
