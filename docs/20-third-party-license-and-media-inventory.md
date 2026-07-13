# Third-Party, License, and Media Inventory

Satisfies Phase 0 task P0-07 (preliminary license register). Update before final video and Devpost submit.

## Repository License

| Item | License | Location |
|---|---|---|
| AgentCore repository (hackathon slice included) | See root LICENSE | `/LICENSE` |

Hackathon code is part of the same repository unless a separate public extraction is chosen ([../08-risks-decisions-and-open-questions.md](../08-risks-decisions-and-open-questions.md)).

## Runtime Dependencies (hackathon slice)

### Python (`change-society-service/requirements.txt`)

| Package | Role | Notes |
|---|---|---|
| fastapi, uvicorn, pydantic | HTTP API | Standard OSS licenses |
| httpx | Qwen HTTP client | Infrastructure only |
| psycopg (if used) | PostgreSQL adapter | Infrastructure only |

Verify exact versions in `requirements.txt` at release freeze.

### Node (`hackathon/frontend/package.json`)

| Package | Role | Notes |
|---|---|---|
| next, react, react-dom | Demo UI | Next.js MIT |
| typescript | Build | Apache-2.0 |

Run `npm install` only in `hackathon/frontend`; lockfile if present should be committed for reproducible builds.

### Infrastructure images (`deployments/compose.yaml`)

| Image | Role |
|---|---|
| postgres:16 (or as pinned in compose) | Runtime persistence |
| Built API/web images | From hackathon Dockerfiles |

## AgentCore Reuse (not copied wholesale)

Documented in [../07-main-documentation-reuse-map.md](../07-main-documentation-reuse-map.md). Hackathon does not import other services’ private databases.

## Demo Data and Media

| Asset | Origin | License / rights |
|---|---|---|
| Scenario text and evidence IDs | Synthetic, in-repo | Project-authored |
| UI typography (Inter, system UI) | Google Fonts / system | Use per font license; no trademark logos in UI |
| Architecture mermaid diagrams | In-repo docs | Project-authored |
| Video narration, music, b-roll | **Entrant-created or licensed** | **Entrant must confirm** |
| Screenshots | From synthetic demo | No real customer data |

## Submission Media Checklist

- [ ] No unlicensed stock music in video
- [ ] No third-party trademarks without permission
- [ ] No Qwen/Alibaba logos unless compliant with brand guidelines
- [ ] Blog post images same rules as video

## Fonts and Icons

Default UI uses CSS `Inter, ui-sans-serif, system-ui` ([frontend/app/globals.css](../frontend/app/globals.css)). If adding icon packs or fonts, record package name and license here.

## Open Source Attribution

If Devpost or README requires attribution list, generate from:

```bash
cd hackathon/frontend && npm license list --json
pip-licenses -r hackathon/backend/change-society-service/requirements.txt  # if tool available
```

Record output hash or attach SBOM in release notes (optional).

## Entrant Responsibilities

- Confirm eligibility and prize rules separately from this inventory
- Own video and blog copyright
- Confirm Alibaba and Qwen terms of service for public demo usage
