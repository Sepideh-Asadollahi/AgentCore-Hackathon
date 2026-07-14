# Qwen Cloud Integration

Qwen Cloud is the **primary LLM runtime** for live demos and production-shaped deployments. Integration is through an OpenAI-compatible chat-completions API behind the application-owned `ModelClient` port—not a swap-in generic endpoint.

## Configuration

Use `QWEN_*` and `CHANGE_SOCIETY_*` variables in `hackathon/.env.example`. Model id, endpoint, temperature, timeout, retries, max output tokens, run token budget, and tool enablement are **configuration only** (never hard-coded in domain logic).

| Variable (typical) | Purpose |
|---|---|
| `CHANGE_SOCIETY_MODEL_PROVIDER` | `qwen` vs `fake` (deterministic CI) |
| `QWEN_API_KEY` / base URL | Cloud credentials and compatible endpoint |
| `QWEN_MODEL` | Deployment id shared by role adapters unless overridden per env |
| `QWEN_TEMPERATURE` | Fixed per run for reproducible benchmarks |
| `CHANGE_SOCIETY_QWEN_RUN_TOKEN_BUDGET` | Fail-closed cap per society run (`BudgetEnforcingModelClient`) |
| Tool flags | Optional role tools via `qwen_role_tools` (bounded rounds) |

## Role → model → contract

All specialist roles invoke the **same configured Qwen deployment** by default, but each call is a **distinct engineered invocation**:

| Role | Pydantic output | System intent |
|---|---|---|
| Context Scout | `ContextOutput` | Scoped evidence bundle; exclusions for stale/restricted |
| Change Analyst | `RoleOutput` | Interpret ambiguous change; cites evidence |
| Impact Analyst | `RoleOutput` | Cross-boundary impacts and tasks |
| Policy Guardian | `RoleOutput` | Policy tags, approval risk, governance tasks |
| Coordinator / Judge | `JudgeOutput` | Reconcile conflict; verdict and required approvers |
| Frontend Delivery Lead | `FrontendDeliveryOutput` | Downstream UI/API-client tasks when signals fire |
| Single-agent baseline | `RoleOutput` | One-shot reviewer for Track 3 comparison |

**Why one model id still counts as “sophisticated”:** separate prompts, schemas, tool surfaces, and post-processors per role; deterministic domain policy overrides model suggestions; negotiation and approval are not prompt hacks—they are state machine + tickets.

Optional future ADR: per-role model ids (e.g. smaller model for Context Scout, larger for Judge) via config map—document in deployment env when used.

## Structured output pipeline

1. **Schema injection** — Pydantic `model_json_schema()` appended to system prompt (`qwen_client.py`).
2. **JSON mode** — `response_format: json_object` on final completion pass.
3. **Parse** — `extract_json_object` strips fences and noise (`qwen_output_normalizer.py`).
4. **Normalize** — role-specific field fixes (e.g. Frontend Delivery, Judge).
5. **Validate** — Pydantic validation; malformed output → typed dependency error.
6. **Repair retry** — bounded retry with repair hint (counts against token budget).
7. **Tool loop** — optional tools per role; max rounds configured; tool results fed back as messages.

Non-retryable: schema validation failures after repair budget exhausted (fail closed; run may error).

## Reliability and errors

- Retries: timeouts, connection errors, rate limits, selected 5xx (bounded).
- Token usage and duration recorded per message for metrics and judging profile.
- Quota / budget exhaustion maps to explicit error codes for operators.
- `DeterministicModelClient` (`fake`) is for CI only; production readiness requires `qwen`.

## Token budget and parallelism

- **Per-run budget** wraps the model client to prevent runaway multi-role loops during schema repair.
- **Parallelism:** society execution is sequential by design (audit order); external LangGraph/webhook workers may run concurrently elsewhere, but ticket/message order is durable on the control plane.
- **Context caching:** not assumed; evidence is retrieved per run with a configurable token budget on the evidence port.

## Negotiation and judging

- Conflict detection is **domain policy** (`detect_specialist_conflict`, negotiation gates)—not LLM-only.
- Rebuttal prompts include “ONE BOUNDED REBUTTAL” and opponent message excerpts.
- Judge/coordinator call uses `JudgeOutput`; human approval still required when policy tags demand it (`requires_human_approval`).

## Live validation

1. Set `CHANGE_SOCIETY_MODEL_PROVIDER=qwen` and credentials.
2. `GET /ready` — model configured; store ready.
3. **Free API smoke (minimal tokens):** `bash tests/live/change-society/smoke-qwen-free-api.sh` → `evidence/live/qwen-free-api-smoke.json`
4. Run `checkout-api-refactor` via UI or `tests/live/change-society/run-live-test.sh`.
5. Preserve redacted report: model id, tokens, latency, run id, correlation id—no raw secrets.

Commands: `tests/live/change-society/smoke-qwen-free-api.sh`, `tests/live/change-society/run-live-test.sh`, `tests/live/change-society/run-real-qwen-suite.sh` (multi-scenario live suite).

## MCP / custom skills

Track 3 rewards advanced cloud usage. This repo’s **custom engineering** is the control plane, Universal Agent JSON, Qwen adapter, normalizer, and role tool executor. MCP can attach to external workers via webhook/LangGraph adapters ([11-agent-language-and-langchain-sdk.md](11-agent-language-and-langchain-sdk.md)); document any MCP servers you enable at demo time in your submission notes.

Related: [24-baseline-ablation-and-efficiency.md](24-baseline-ablation-and-efficiency.md), [25-pitch-and-demo-focus.md](25-pitch-and-demo-focus.md).
