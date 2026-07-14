# Quickstart

Judges: see [14-submission-pack-index.md](14-submission-pack-index.md) for the fast review path.

## One-command install

From the **repository root** (folder that contains `install.sh`, `backend/`, `frontend/`):

```bash
bash install.sh --non-interactive --install-os-deps
```

This runs **OS prerequisites** (Debian/Ubuntu: Python 3.12, Node/npm, Docker + Compose v2, curl, git), then **venv**, **pip**, **npm**, **Docker PostgreSQL**, and SQL migrations.

**Prerequisites only** (no venv/npm app install yet):

```bash
bash install.sh --prerequisites-only
```

Minimal interactive install (assumes prerequisites already on PATH):

```bash
bash install.sh
```

Options:

```bash
bash install.sh --profile demo          # default: venv, backend deps, frontend npm, demo .env
bash install.sh --profile verify        # demo install + live Qwen end-to-end test (one scenario)
bash install.sh --profile production    # print Qwen/PostgreSQL/Alibaba hints only
bash install.sh --dry-run               # show steps without changing the machine
bash install.sh --skip-frontend         # backend only (no Node/npm)
bash install.sh --non-interactive --install-os-deps   # recommended on fresh VMs
bash install.sh --non-interactive --install-os-deps --systemd   # + user systemd: worker, API, UI
bash install.sh --runtime systemd --install-os-deps   # same as --systemd
bash install.sh --runtime docker        # full Docker Compose (needs QWEN + DB password in .env)
```

PostgreSQL via Docker is **required** for demo/verify profiles (`CHANGE_SOCIETY_STORE=postgresql`). See README **Manual install — prerequisites** for per-package install commands on other distros.

On an **interactive terminal**, `bash install.sh` shows an ASCII banner and numbered menus.

The installer writes `.env` with **`CHANGE_SOCIETY_MODEL_PROVIDER=fake`** (AgentCore orchestrates) and **LangGraph workers** on port **32510**. Set **`QWEN_API_KEY`** and start the worker stack before running demos.

## Local demonstration (default: LangGraph workers + AgentCore)

1. Install or copy `.env.example` → `.env` and set **`QWEN_API_KEY`**.
2. Start worker + API:

```bash
bash scripts/start-langgraph-demo-stack.sh
```

3. In another terminal: `cd frontend && npm run dev` → `http://localhost:3000`.

Or use **`deployments/compose.yaml`** (worker + API + Postgres + UI).

Default development: **six LangGraph roles** via signed webhook; **AgentCore** owns tickets, negotiation, and approval. Offline CI: `bash tests/e2e/change-society/run-deterministic-regression.sh`.

## PostgreSQL (required — Docker)

Install starts **PostgreSQL 16** with `deployments/compose.dev-postgres.yaml`, sets `CHANGE_SOCIETY_STORE=postgresql`, and applies migrations under `backend/change-society-service/migrations/`. Production also requires live Qwen in workers when `WORKER_USE_LLM=1`.

## Verification

```bash
bash ../tests/backend/change-society-service/run-pytest.sh -q
cd frontend && npm run typecheck
node --experimental-strip-types --test tests/frontend/change-society/demo-state.test.mjs
bash ../tests/e2e/change-society/run-real-test.sh
```

Evidence files: [19-evidence-artifact-index.md](19-evidence-artifact-index.md).

On CPUs that cannot load the native Next.js SWC binary, use the WASM/Webpack command in [06-testing-and-evaluation.md](06-testing-and-evaluation.md).
