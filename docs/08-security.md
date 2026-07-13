# Security

- Synthetic demo data only.
- Tenant/workspace/project scope is required for every business endpoint.
- Restricted and deprecated evidence is removed before Qwen invocation.
- Provider output is schema-validated and cannot bypass deterministic policy.
- High-risk or unresolved conflicts fail closed.
- Approval binds to run version and evidence digest.
- Secrets are environment-injected and redacted from public artifacts.
- Retryable commands use scoped idempotency keys.
- Production refuses fake model and in-memory persistence.

Before release, scan Git history, logs, browser bundles, screenshots, and video for credentials or private information.

## Version Control Boundaries

- `hackathon/.gitignore` blocks `.env`, keys, `node_modules/`, `.next/`, build caches, local recordings, and **`evidence/live/`** (production-shaped test output).
- Only redacted deterministic reports under `hackathon/evidence/real/` are intended for Git. Regenerate with `run-real-test.sh`; never commit raw Qwen prompts, API keys, or Alibaba internal hostnames.
