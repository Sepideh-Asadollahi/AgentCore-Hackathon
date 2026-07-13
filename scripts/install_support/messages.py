from __future__ import annotations

from .types import RuntimeMode


def production_hints() -> None:
    print(
        """
Production profile (manual — not auto-configured):
  • Copy hackathon/.env.example to hackathon/.env and set QWEN_API_KEY.
  • Set CHANGE_SOCIETY_MODEL_PROVIDER=qwen and CHANGE_SOCIETY_STORE=postgresql.
  • Apply SQL migrations under hackathon/backend/change-society-service/migrations/.
  • Use hackathon/deployments/compose.yaml or hackathon/deployments/alibaba/.
  • Verify: bash hackathon/scripts/run-live-test.sh compose|remote
  • Example full Docker install: bash install.sh --non-interactive --runtime docker --install-os-deps
"""
    )


def narrative_for_runtime(runtime: RuntimeMode) -> str:
    if runtime == "systemd":
        return """
After install (systemd user units):
  • API:  http://127.0.0.1:32500/health
  • UI:   http://127.0.0.1:32501
  • Example: systemctl --user restart change-society-api.service
"""
    if runtime == "docker":
        return """
After install (Docker Compose):
  • Example: docker compose -f hackathon/deployments/compose.yaml ps
  • API:  http://127.0.0.1:32500/health
  • UI:   http://127.0.0.1:32501
"""
    if runtime == "none":
        return """
Dependencies installed; no services were started.
  • Example manual API: see hackathon/docs/01-quickstart.md
  • Example proof:      bash hackathon/scripts/run-real-test.sh
"""
    return """
After install — two terminals from the repository root:

  Terminal 1 (API):
    set -a && source hackathon/.env && set +a
    PYTHONPATH=hackathon/backend/change-society-service/src \\
      .venv/bin/python -m uvicorn change_society.main:app --host 127.0.0.1 --port 32500

  Terminal 2 (demo UI):
    cd hackathon/frontend && npm run dev
    Open http://localhost:32501

  Automated proof (no browser):
    bash hackathon/scripts/run-real-test.sh
"""
