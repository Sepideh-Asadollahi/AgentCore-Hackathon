# Implementation Phase Traceability

| Phase | Implementation evidence | Verification |
|---|---|---|
| 0 | `.env.example`, scope docs, AGENTS, phase ledger, baseline/significant-updates doc | manual readiness gate remains entrant-owned |
| 1 | Qwen adapter, typed errors, config, fake, optional live test | adapter tests; `test_qwen_live.py` with `QWEN_API_KEY` |
| 2 | run domain, ManagedAgent, AgentTicket, Universal Agent JSON, OpenAPI | schema, lifecycle, and OpenAPI tests |
| 3 | control plane, capability router, model/webhook adapters, translator SDK, LangChain/LangGraph bridge, specialist profiles | managed-agent ticket lifecycle and runtime SDK tests |
| 4 | evidence catalog, current/deprecated/restricted filtering, memory | isolation and cross-session test |
| 5 | conflict detector, rebuttal, Judge, approval | negotiation and approval tests |
| 6 | FastAPI plus Next.js demo states, protocol timeline, resume | ASGI test, typecheck, production build, frontend state tests |
| 7 | three scenarios and single-agent evaluation | reproducible metric tests and `evaluation-scenarios.json` |
| 8 | PostgreSQL migration, containers, Alibaba ADR and deploy script | local artifacts; live cloud evidence pending credentials |
| 9 | submission doc pack (14–22), SUBMISSION.md, checklists | Devpost, video, blog, public URLs remain entrant-owned |

No code can prove entrant eligibility, publish the video/blog, or create a paid cloud deployment without account authorization. Those phase items remain explicit external gates.
