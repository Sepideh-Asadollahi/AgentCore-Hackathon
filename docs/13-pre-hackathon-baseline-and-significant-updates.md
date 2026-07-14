# Pre-Hackathon Baseline and Significant Updates

This document satisfies Phase 0 task P0-05 and supports Devpost significant-update disclosure (Phase 9).

## Pre-Hackathon Baseline (before May 26, 2026)

AgentCore already contained platform architecture documentation, Phase 1/2 service scaffolds, modular backend standards, and interoperability design for Universal Agent JSON. The repository did **not** yet contain an isolated Change Society vertical slice with:

- hackathon-scoped `change-society-service` domain/application/infrastructure boundaries;
- managed-agent registry, durable `AgentTicket` lifecycle, and capability routing;
- Qwen Cloud adapter with deterministic fake seam;
- negotiation, conflict, rebuttal, and fail-closed human approval for Track 3;
- three-scenario evaluation dataset and single-agent baseline comparison;
- Next.js judged demo UI and hackathon deployment pack.

## Significant Hackathon-Period Additions (after May 26, 2026)

All items below are implemented under `hackathon/` unless noted:

| Area | Addition | Evidence |
|---|---|---|
| Product slice | Change Society control-plane demo service | `hackathon/backend/change-society-service/` |
| Protocol | Universal Agent JSON v1 role contracts and translator SDK | `hackathon/sdk/python/`, service contracts |
| Qwen integration | OpenAI-compatible adapter, bounded retry, schema validation | `infrastructure/qwen_client.py`, adapter tests |
| Agent society | Five managed agents, seven-ticket lifecycle, one rebuttal round | society integration tests, `tests/e2e/change-society/verify_society_run.py` |
| Memory | Scoped evidence catalog, deprecated/restricted filtering, cross-session recall | evidence catalog + memory test |
| Evaluation | Three versioned scenarios and baseline metrics | `evaluation-scenarios.json`, Phase 7 tests |
| Demo UX | Four-state UI with protocol timeline and approval boundary | `hackathon/frontend/` |
| Deployment | Compose stack + Alibaba ECS proof template + ADR | `hackathon/deployments/` |
| Documentation | Phase pack, quickstart, security, traceability, ledger | `hackathon/docs/`, `hackathon/phases/` |

## Update Statement Template (Devpost)

Use this English summary in the submission description:

> After May 26, 2026 we added the AgentCore Change Society hackathon slice: a Qwen-powered agent control plane with managed external agents, Universal Agent JSON negotiation, scoped memory, human approval, three-scenario baseline evaluation, a public demo UI, and Alibaba deployment artifacts. Earlier AgentCore platform documentation and service scaffolds remain the foundation; the hackathon work is isolated under `hackathon/` with new tests and evidence scripts.

Replace deployment URLs and live Qwen evidence with entrant-owned values before submission.
