# Web interface guide (Change Society demo UI)

English guide for **judges**, **reviewers**, and **operators** using the Next.js workspace. Technical layout rules remain in [ui-shell-layout.md](./ui-shell-layout.md).

## Default URLs (local / systemd)

| Surface | Default port | Path |
|--------|--------------|------|
| Web UI | `32501` (or `CHANGE_SOCIETY_WEB_PORT`, e.g. `3200` on public demos) | `/overview` |
| API (direct curl) | `32500` | `/health`, `/ready`, `/docs` |
| LangGraph worker | `32510` (localhost only) | `/ready` |

Browsers usually call the API via **same-origin proxy**: `{UI origin}/change-society-api/...` → backend on `127.0.0.1:32500`.

## Sidebar navigation

| Label | Route | Purpose |
|-------|-------|---------|
| **Home** | `/overview` | Session snapshot: latest run link, quick path to **Work queue** |
| **Run** | `/runs` | Pick a **demo scenario**, start or reload a society run |
| **Settings** | `/settings` | Browser connection (proxy/direct), scope IDs, LLM fields, connection test |
| **Work queue** | `/agents?run=…&tab=…` | **Primary judge hub** after a run exists — tabs below |

**Policy** (`/policy`) is routable but not in the sidebar; use it for org-policy intake demos when documented in [30-org-policy-intake-slice.md](../docs/30-org-policy-intake-slice.md).

## Home (`/overview`)

- Shows workspace status and pointers to the active run.
- Use **Work queue** (or the run link) to open the run detail hub once a society run has been created.

## Run (`/runs`)

| UI element | What it does |
|------------|----------------|
| Scenario selector | Lists `GET …/demo-scenarios` (seven multi-domain demos) |
| **Load latest demo** | Reopens the last saved run for the selected scenario (no new POST) |
| **Run new demo** / live test | Creates a new society run (orchestration + external LangGraph workers when configured) |
| Judge intro copy | Explains LangGraph worker, Qwen, and display-only auto-approve |

### Society run progress dialog

Opens while a run is launching or executing.

- **In progress:** steps list (gather context → specialists → negotiation → approval, etc.); no close control until the pipeline settles (keep the tab open).
- **Complete / failed:** single **Close** footer action; optional **Open Work queue** (or **Open run anyway** on error).
- Does **not** configure the server — it only reflects API polling for the current run.

## Work queue hub (`/agents`)

Requires `?run=<run_id>` (set automatically after launch or from Home). Seven tabs — suggested judge order:

| Tab | Label | What to verify |
|-----|-------|----------------|
| **guide** | Guide | Run state, plain-language walkthrough, where to click next |
| **story** | Agent Story | Business problem, phased narrative, **Mermaid flow map** of messages |
| **queue** | Work Queue | **Task routing proof** — tickets, states, assigned agents |
| **dialogue** | Messages | Raw protocol messages (audit / technical) |
| **approve** | Review | Conflicts, risk summary, human approve / reject / request changes |
| **reports** | Results | Rubric-style scores, tokens, baseline comparison |
| **request** | Details | Original request text and IDs for log correlation |

Deep links: `/agents?run=<id>&tab=story` (aliases like `tab=flow` map to **Agent Story**).

### Registered agents panel (Work queue tab)

Lists **managed agents** from the control plane (model vs webhook). On the default hackathon profile, specialists call the **LangGraph webhook worker** on port `32510` when `managed-agents.integrator-live-all.example.json` is active.

## Settings (`/settings`)

Three areas:

### Workspace API settings

- **API access:** same-origin **proxy** (recommended on LAN/public IP) vs **direct** API URL from the browser.
- **Project / tenant / workspace / actor IDs:** sent as `X-*` headers on every API call.
- Stored in **`localStorage` only** (per browser).
- After **Save settings:** **reload the tab** so lists and SSR pick up new scope — **no systemd restart** for these fields.
- **Test connection** hits `/ready` and `/demo-scenarios` with current headers.

### LLM API settings

- Base URL, model, and **API key** for Qwen.
- **Save key & restart worker**: sends the key once to `POST /api/v1/hackathon/dev/judge-runtime-apply` — stored in **PostgreSQL** (`change_society_runtime_secrets`) and server `.env`, then restarts the worker. **The API key is never written to browser localStorage.**
- **Apply to running API (dev)**: only shown when the API uses in-process Qwen (`MODEL_PROVIDER=qwen`). On the default **fake + LangGraph worker** stack, use **Save key & restart worker** — not Apply (the orange warning appears if you click Apply on the wrong stack).
- **Apply to running API (dev):** hot-update when `CHANGE_SOCIETY_MODEL_PROVIDER=qwen`.
- Browser-only **Save settings** still requires tab reload for scope IDs; it does not restart services.

### Debug logging

- Verbose client console (`ChangeSociety` tag); no server restart.

Live QA script (restart behavior): `bash scripts/live-test-web-settings-restart.sh` from pack root.

## Other modals

| Dialog | Trigger | Notes |
|--------|---------|--------|
| Clear session run | Reset control on Run page | Clears browser session binding only |
| Active run | Overview link | Short summary of bound `run_id` |

## What judges should use outside the UI

| Need | Where |
|------|--------|
| Submission navigation | [docs/14-submission-pack-index.md](../docs/14-submission-pack-index.md) |
| Live / real test evidence | [docs/27-judge-live-and-real-test-evidence.md](../docs/27-judge-live-and-real-test-evidence.md) |
| LangGraph seven scenarios | [docs/29-langgraph-sdk-live-seven-scenarios.md](../docs/29-langgraph-sdk-live-seven-scenarios.md) |
| Compliance JSON (machine-readable) | `GET /api/v1/hackathon/submission-compliance` |
| Architecture | [docs/02-architecture.md](../docs/02-architecture.md) |
| Integrator / worker | [docs/26-external-agent-integrator-guide.md](../docs/26-external-agent-integrator-guide.md) |

## Related docs

- [ui-shell-layout.md](./ui-shell-layout.md) — layout stack, proxy env vars, incident notes
- [../docs/31-frontend-ui-shell.md](../docs/31-frontend-ui-shell.md) — short reviewer summary
- [../docs/25-pitch-and-demo-focus.md](../docs/25-pitch-and-demo-focus.md) — which scenario to show on video
