# Frontend UI shell and routing

This document explains how the Change Society Next.js workspace layout renders pages, why the main column must stay visible, and how to extend the UI without reintroducing blank-page bugs.

## Layout stack

```text
app/layout.tsx                    (html, dark theme, globals.css)
  └── app/(app)/layout.tsx        Server: fetch demo-scenarios → ClientAppLayout
        └── client-layout.tsx     RunWorkspaceProvider → AppShell → {page}
              └── AppShell.tsx    Sidebar + header + RouteTransition → {page}
                    └── app/(app)/*/page.tsx
```

The server layout prefetches demo scenarios from the API (`lib/server-change-society.ts`) so `/runs` is usable even before client hydration; the browser still uses the `/change-society-api` proxy for mutations and refresh (`force-dynamic` on the segment).

| Layer | Responsibility |
| --- | --- |
| `RunWorkspaceProvider` | Session run state, API polling, modals |
| `AppShell` | Sidebar navigation (`WORKSPACE_NAV_ROUTES`: Home, Run, Settings), header from `lib/routes.ts`, status chip |
| `RouteTransition` | Optional route change motion (single mount point) |
| Page components | Route-specific panels via `lib/workspace-ui.ts` |

**Rule:** `app/(app)/layout.tsx` must pass `{children}` directly into `AppShell`. Do **not** wrap `{children}` in `RouteTransition`, `AnimatePresence`, or another motion wrapper in the layout file.

## Incident: sidebar visible, main area empty

### Symptoms

- Sidebar and top header render (title, status badge).
- Main content region appears blank (black) although React still mounts page nodes in the DOM.

### Root cause

1. **Nested route transitions** — `PageTransition` was used both in `app/(app)/layout.tsx` and inside `AppShell`, stacking two `AnimatePresence` + `motion.div` layers with `initial={{ opacity: 0 }}`.
2. **Opacity-based enter** — inner and outer wrappers could remain at `opacity: 0` if enter animations did not complete or conflicted, hiding all page content while chrome stayed visible.

### Permanent fix

1. **Single transition owner** — `RouteTransition` lives under `components/app-shell/` and is imported only from `AppShell.tsx`.
2. **Transform-only enter/exit** — motion uses vertical `y` offset only; opacity stays at default `1` so content is never fully hidden on load.
3. **`AnimatePresence initial={false}`** — first paint skips enter animation so the first route is immediately visible.

## Adding a new workspace page

1. Add a route entry in `lib/routes.ts` (`APP_ROUTES`, `routeByPath`).
2. Create `app/(app)/<segment>/page.tsx` (client component if it uses `useRunWorkspace`).
3. Use `panelClass()` / tokens from `lib/workspace-ui.ts` for cards.
4. Do not add layout-level animation wrappers.

## Scenario dropdown (`WorkspaceSelect`)

Native `<select>` misbehaved in the dark shell (option contrast, stacking under `overflow` panels). Use **`WorkspaceSelect`** (`components/workspace/WorkspaceSelect.tsx`) built on **`@radix-ui/react-select`** with **`SelectPortal`** (`z-index` 200). Until client mount it renders a styled native `<select>` so SSR and slow hydration still show all scenario labels (important on LAN IP). Used on `/runs`.

## API access from the browser

By default the UI calls **`/change-society-api/*`** (Next.js rewrite in `next.config.mjs` → backend on `127.0.0.1:32500`). That avoids calling `localhost:32500` from a remote browser (e.g. `http://192.168.x.x:32501`) and avoids extra CORS setup.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CHANGE_SOCIETY_USE_PROXY=false` | Call `NEXT_PUBLIC_CHANGE_SOCIETY_API_URL` directly from the browser |
| `NEXT_PUBLIC_CHANGE_SOCIETY_API_URL` | Direct API origin when proxy is off |
| `CHANGE_SOCIETY_PROXY_TARGET` | Rewrite target for dev server / standalone (default `http://127.0.0.1:32500`) |

Bootstrap uses `Promise.allSettled` so a failing agents/ready call does not block scenario loading.

## Web interface (judges)

Full walkthrough of **Home**, **Run**, **Work queue** tabs, **Settings**, and the society-run progress dialog: **[web-interface-guide.md](./web-interface-guide.md)**.

## Settings page (`/settings`)

Operators edit **connection-only** fields in the browser: API access mode (proxy vs direct URL), project / tenant / workspace / actor IDs. Saved in `localStorage` (`lib/client-settings.ts`); **`api.ts` reads them on each request**. After save, **reload the tab** to refetch scenarios — no API process restart for these fields. LLM/worker keys and PostgreSQL stay in `hackathon/.env` (see [web-interface-guide.md](./web-interface-guide.md#settings-settings)).

## Commands

From `hackathon/frontend/`:

```bash
npm run dev          # http://localhost:32501
npm run typecheck
npm run build
npm test             # repo tests/frontend/change-society/*.test.mjs
```

From hackathon pack root:

```bash
bash ../tests/frontend/change-society/run-frontend-tests.sh
```

## Related docs

- [web-interface-guide.md](./web-interface-guide.md) — judges: all UI areas and tabs
- [app/README.md](../app/README.md) — App Router segments
- [06-testing-and-evaluation.md](../../docs/06-testing-and-evaluation.md) — frontend unit tests
- [08-security.md](../../docs/08-security.md) — secrets and `.gitignore` boundaries
