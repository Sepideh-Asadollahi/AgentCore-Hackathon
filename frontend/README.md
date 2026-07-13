# Change Society Web

Path: `hackathon/frontend`

## Purpose

Next.js and TypeScript judged control surface for starting a society run, inspecting directed Universal Agent JSON messages, reviewing conflict evidence, making a human approval decision, and comparing the society with a single-agent baseline.

## Boundary

Owns presentation and browser interaction only. All authorization, state transitions, policy, persistence, and approval enforcement remain in the backend.

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

The configured development port is 32501, not the Next.js default.

## Judge Demo Flow

1. Backend at `NEXT_PUBLIC_CHANGE_SOCIETY_API_URL` (default `http://localhost:32500`).
2. `npm run dev` → `http://localhost:32501`.
3. **Cinematic demo** (default): pick any of **seven domain scenarios**, review governance rules, click **Run live test** (real `POST .../society-runs`). While the backend runs, the UI animates orchestration stages; with **Auto-play all stages** enabled it walks all eight beats (intro → outcome) using live tickets and messages. Approve from the approval beat when the run pauses.
4. **Inspector mode**: tab switch for full tickets, raw protocol expansion, and manual exploration.
5. See [../docs/17-video-storyboard-and-recording-guide.md](../docs/17-video-storyboard-and-recording-guide.md).

Keyboard in cinematic mode: `→` / `←` change beat, `Esc` returns to inspector. Animations respect `prefers-reduced-motion`. The UI uses a **glassmorphism** layer (`app/glass.css`: translucent panels, backdrop blur, mint-tinted borders); `prefers-reduced-transparency` falls back to opaque surfaces.

## Status

Active hackathon demo UI.
