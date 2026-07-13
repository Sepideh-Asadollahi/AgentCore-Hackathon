# Blog Post Outline (Blog Post Award)

Publish a **public English** build-journey post and add the URL to the Devpost submission. Thoroughness and potential impact matter for the award; this outline matches [../06-judging-demo-and-submission-plan.md](../06-judging-demo-and-submission-plan.md).

## Suggested Title Options

- “Building a Governed Agent Society on Qwen Cloud: Control Plane, Not Another Chatbot”
- “When a Tax Refactor Hides Revenue Risk: Multi-Agent Negotiation with Universal Agent JSON”

## Outline

### 1. Hook (150 words)

- The **`checkout-api-refactor`** hook: “internal refactor” drops `taxIncluded` and breaks mobile clients
- Why single-pass review misses contract and policy evidence

### 2. Why Track 3 (200 words)

- AgentCore thesis: interoperability and governance
- Why not duplicate Track 1/4 submissions

### 3. Architecture choice (300 words)

- Control plane vs agent runtime ([10-agent-control-plane-boundary.md](10-agent-control-plane-boundary.md))
- ManagedAgent + AgentTicket model
- Link to HLD and mermaid in [02-architecture.md](02-architecture.md)

### 4. Qwen integration (300 words)

- OpenAI-compatible adapter, schema validation, bounded retry
- Role-specific `RoleOutput` contracts
- Token/cost awareness ([03-qwen-cloud-integration.md](03-qwen-cloud-integration.md))

### 5. Universal Agent JSON (250 words)

- Directed messages, not hidden prompt soup
- Rebuttal round design and failure modes

### 6. Memory lesson (250 words)

- Deprecated vs current evidence (`ev_old_refactor`, payment stale gateway)
- Cross-session recall after approval

### 7. Conflict story (250 words)

- Change Analyst low vs Policy Guardian high
- What failed without rebuttal + judge

### 8. Alibaba deployment (200 words)

- ECS + Compose decision ([../deployments/alibaba/ADR-001-minimum-topology.md](../deployments/alibaba/ADR-001-minimum-topology.md))
- Secrets injection; `/ready` semantics

### 9. Evaluation honesty (200 words)

- Three scenarios; deterministic vs live runs
- Link or summarize `evaluation-scenarios.json`
- Caveat: not statistically significant

### 10. Limitations and roadmap (150 words)

- No code mutation in MVP
- Post-hackathon promotion into main AgentCore services

## Publishing Checklist

- [ ] Public URL (Medium, Dev.to, personal site, etc.)
- [ ] English throughout
- [ ] Code snippets omit secrets
- [ ] Link back to `{{GITHUB_REPO_URL}}/hackathon/SUBMISSION.md`
- [ ] Verify link in Devpost after publish

## Entrant-Owned

Hosting account, final prose, and publication date.
