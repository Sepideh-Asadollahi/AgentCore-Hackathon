# Frontend UI shell (Change Society workspace)

Public-facing summary for reviewers and contributors. Full layout rules and the blank-main-column incident write-up live in [../frontend/docs/ui-shell-layout.md](../frontend/docs/ui-shell-layout.md).

## What judges see

- Multi-page App Router workspace (`/overview`, `/policy`, `/runs`, …) with Animate UI sidebar.
- Shared session state via `RunWorkspaceProvider` (runs, messages, conflicts, modals).
- Dark neutral theme; page content is rendered in the **main column** beside the sidebar, not as a single tabbed canvas.

## Layout contract (must hold)

| Do | Do not |
| --- | --- |
| Wrap pages only inside `AppShell` + `RouteTransition` | Wrap `{children}` in `app/(app)/layout.tsx` with motion |
| Use one `RouteTransition` mount | Nest `AnimatePresence` around the same `{children}` twice |
| Prefer transform-only route motion | Rely on `opacity: 0` for initial page enter |

Regression of this contract caused an empty main area with a visible sidebar (documented in the frontend doc above).

## Verification

```bash
cd frontend && npm run typecheck && npm run build
bash scripts/run-frontend-tests.sh
```

Manual smoke: open `/overview` and confirm dashboard cards render in the main column after hard refresh.

## See also

- [06-testing-and-evaluation.md](06-testing-and-evaluation.md)
- [17-video-storyboard-and-recording-guide.md](17-video-storyboard-and-recording-guide.md)
