# Quickstart

Judges: see [14-submission-pack-index.md](14-submission-pack-index.md) for the fast review path.

## One-command install

From the **repository root** (folder that contains `install.sh`, `backend/`, `frontend/`):

```bash
bash install.sh
```

Options:

```bash
bash install.sh --profile demo          # default: venv, backend deps, frontend npm, demo .env (qwen — set QWEN_API_KEY)
bash install.sh --profile verify        # demo install + live Qwen end-to-end test (one scenario)
bash install.sh --profile production    # print Qwen/PostgreSQL/Alibaba hints only
bash install.sh --dry-run               # show steps without changing the machine
bash install.sh --skip-frontend         # backend only (no Node/npm)
bash install.sh --non-interactive --install-os-deps   # Debian/Ubuntu: apt for venv, node, docker
bash install.sh --runtime systemd --install-os-deps   # user systemd units for API + UI
bash install.sh --runtime docker        # full Docker Compose (needs QWEN + DB password in .env)
bash install.sh --with-postgres         # optional dev PostgreSQL container (Docker)
```

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

## PostgreSQL profile (optional persistence)

Set `CHANGE_SOCIETY_STORE=postgresql` and `CHANGE_SOCIETY_DATABASE_URL`. Apply migrations under `backend/change-society-service/migrations/`. Production startup requires `qwen` + PostgreSQL.

## Verification

```bash
bash ../tests/backend/change-society-service/run-pytest.sh -q
cd frontend && npm run typecheck
node --experimental-strip-types --test tests/frontend/change-society/demo-state.test.mjs
bash ../tests/e2e/change-society/run-real-test.sh
```

Evidence files: [19-evidence-artifact-index.md](19-evidence-artifact-index.md).

On CPUs that cannot load the native Next.js SWC binary, use the WASM/Webpack command in [06-testing-and-evaluation.md](06-testing-and-evaluation.md).
