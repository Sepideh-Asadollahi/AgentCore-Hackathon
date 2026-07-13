# Pitch, Demo Focus, and Feature Framing

English copy for Devpost, judges, and the **under-3-minute** video. Recording steps live in [17-video-storyboard-and-recording-guide.md](17-video-storyboard-and-recording-guide.md).

## One-line thesis

> **Change Society is a governed multi-agent decision system that turns ambiguous software changes into auditable, negotiated, human-approved decisions.**

Supporting line: the same control-plane pattern is exercised on **seven organizational scenarios** (not seven unrelated demos).

## What not to lead with

Avoid opening with “seven scenarios, six agents, frontend handoff, memory, GDPR, HR…” in the first twenty seconds. That reads as feature sprawl. Introduce breadth **after** the primary story (0:20–2:40 checkout; 2:40–3:00 montage).

## Primary demo scenario: `checkout-api-refactor`

**Why:** coding-adjacent, fast to understand, shows negotiation and policy conflict.

Story beats:

1. Request says “refactor handler only.”
2. **Change Analyst** — low-risk refactor framing.
3. **Impact / Policy** — `taxIncluded` removal vs OpenAPI + mobile tests.
4. **Conflict** — specialist disagreement (not a linear pipeline).
5. **Rebuttal** — one bounded round, evidence cited.
6. **Coordinator** — block / high risk; Platform & Mobile approval; contract tests.
7. **`awaiting_approval`** — human gate.

UI: cinematic mode defaults; **Negotiation at a glance** panel shows roles in plain language ([NegotiationPanel](../frontend/components/NegotiationPanel.tsx)).

## Secondary demo clip (20–30 s): `gdpr-erasure-automation`

Single message for judges:

> GDPR wants delete; finance retention requires invoices; the society produces a **partial-erasure / retention-matrix** plan instead of blindly following one rule.

Do not run the full GDPR workflow in the main video.

## Other scenarios (montage only)

Use `evidence/real/suite/manifest.json` or a static slide listing domains:

- Revenue / billing (`pricing-refactor`)
- Security (`password-migration`)
- Payments + stale memory (`payment-memory`)
- HR PII export (`hr-compensation-export`)
- Vendor offboarding + SSO (`vendor-access-offboarding`)

## Frontend Delivery Lead — framing

Treat as **dynamic downstream task creation**, not a second product:

> During execution, the society may open a new durable ticket when it discovers client, UI, or API-consumer impact—so frontend work is not lost after backend merge.

Keep this **out of the first ninety seconds** of the video. Mention in architecture slide or README.

**Optional 10-second beat (after checkout story):** collapsible **Org policy intake** — “we stated our API approval process; Policy Guardian retrieved `org_policy_*` evidence on the next run.” See [30-org-policy-intake-slice.md](30-org-policy-intake-slice.md).

## Judge UI checklist (no video required)

| Need | Where |
|---|---|
| Run live society test | Cinematic → **Run live test** |
| See negotiation clearly | **Negotiation at a glance** panel |
| Raw protocol | Inspector mode → message list |
| Baseline numbers | **Compare with single agent** + [24-baseline-ablation-and-efficiency.md](24-baseline-ablation-and-efficiency.md) |
| Ablation | `evaluate-baseline` response → `ablation.variants` |

## Devpost description order

1. Outcome (thesis sentence above)
2. Problem (`checkout-api-refactor` hook)
3. Agent Society workflow (tickets → JSON → conflict → approval)
4. Why Qwen ([03-qwen-cloud-integration.md](03-qwen-cloud-integration.md))
5. Metrics + ablation ([24-baseline-ablation-and-efficiency.md](24-baseline-ablation-and-efficiency.md))
6. Breadth (seven scenarios, one architecture)
7. Alibaba / try-it / limitations

Update placeholders in [15-devpost-field-guide-and-checklist.md](15-devpost-field-guide-and-checklist.md) when pasting.
