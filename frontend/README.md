# AgentCore web UI (Change Society demo)

Path: `frontend/`

## Purpose

Next.js judged UI: start a society run, inspect Universal Agent JSON, review conflicts, approve or reject, compare with single-agent baseline.

## Boundary

Presentation only — policy and persistence stay in the backend.

## Configuration

- `NEXT_PUBLIC_CHANGE_SOCIETY_API_URL`
- `NEXT_PUBLIC_CHANGE_SOCIETY_PROJECT_ID`
- `NEXT_PUBLIC_CHANGE_SOCIETY_TENANT_ID`
- `NEXT_PUBLIC_CHANGE_SOCIETY_WORKSPACE_ID`

## Commands

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

Dev server: [http://localhost:32501](http://localhost:32501) (API default [http://localhost:32500](http://localhost:32500)).

## Demo flow

1. Start API (see [docs/01-quickstart.md](../docs/01-quickstart.md)).
2. **Cinematic demo:** choose a scenario → **Run live test** → optional approve at human gate.
3. **Inspector mode:** raw protocol and tickets.

See [docs/17-video-storyboard-and-recording-guide.md](../docs/17-video-storyboard-and-recording-guide.md).
