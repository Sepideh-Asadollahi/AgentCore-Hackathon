# Video Storyboard and Recording Guide

Target duration: **under 3:00** (aim **2:45** for upload buffer). English narration or on-screen text. Synthetic scenario data only.

**Primary scenario:** `checkout-api-refactor` (see [25-pitch-and-demo-focus.md](25-pitch-and-demo-focus.md)).  
**Secondary clip:** 20–30 s on `gdpr-erasure-automation` only.  
**Do not** walk through all seven scenarios in the video.

## Pre-Recording Setup

| Item | Setting |
|---|---|
| Backend | Public Alibaba deployment **or** local with on-screen label “local deterministic demo” for rehearsal; **final submission video should show Alibaba + Qwen** when claiming live cloud |
| Frontend | `http://localhost:32501` or `{{PUBLIC_DEMO_URL}}` |
| Scenario | **`checkout-api-refactor`** — “Refactor checkout HTTP handler…” |
| UI mode | **Cinematic demo** → **Run live test** → enable **Auto-play all stages** for rehearsal |
| Browser | Clean profile; zoom 100%; dark UI readable |

## Shot List (recommended 3-minute arc)

| Time | Visual | Narration / on-screen | Must show |
|---:|---|---|---|
| 0:00–0:20 | Problem hook | “Checkout handler refactor” looks harmless; a single agent may miss client break | Business + coding relevance |
| 0:20–1:20 | Cinematic run | Task decomposition; **AgentTickets**; Context → Change → Impact → Policy | Orchestrator, not one chat |
| 1:20–1:55 | **Negotiation at a glance** panel | Change: low-risk refactor · Policy/Impact: `taxIncluded` / breaking API · conflict · rebuttal | Disagreement is real |
| 1:55–2:20 | Approval beat | Coordinator blocks; Platform/Mobile approval; **`awaiting_approval`** | Fail-closed human gate |
| 2:20–2:40 | Baseline button / slide | Read **actual** numbers from [benchmark-summary.json](../evidence/real/benchmark-summary.json) or UI JSON—do not invent percentages | Single agent vs society |
| 2:40–3:00 | Montage + architecture | Quick slide: seven scenario domains; Alibaba; link repo / SUBMISSION | Breadth without drowning the hook |

## Optional GDPR insert (within 2:40–3:00 montage)

> GDPR erasure vs finance retention—the society proposes partial erasure instead of blindly deleting invoices.

## Recording Checklist

- [ ] Qwen visible (`/ready` provider or on-screen “Qwen Cloud” label)
- [ ] Alibaba public endpoint mentioned if claiming cloud deploy
- [ ] No API keys or `.env` on screen
- [ ] **Negotiation panel** visible (not only raw JSON expanders)
- [ ] Baseline figures match regenerated evidence
- [ ] Export 1080p; verify duration on host platform

## Backup Plan

1. Pre-record a successful **live Qwen** segment if network fails on recording day.
2. Do not label deterministic fake output as live Qwen.
3. Keep a separate full deterministic rehearsal for developers.

## Post-Production

- Map claims to [16-claim-evidence-mapping.md](16-claim-evidence-mapping.md)
- Metrics deep dive: [24-baseline-ablation-and-efficiency.md](24-baseline-ablation-and-efficiency.md)

## Entrant-Owned Deliverable

Final edited video and public URL are **not** stored in the repository.
