from __future__ import annotations

from .types import RuntimeMode


def production_hints() -> None:
    print(
        """
Production profile (manual — not auto-configured):
  • Copy .env.example to .env and set QWEN_API_KEY.
  • Set CHANGE_SOCIETY_MODEL_PROVIDER=qwen and CHANGE_SOCIETY_STORE=postgresql.
  • Apply SQL migrations under backend/change-society-service/migrations/.
  • Use deployments/compose.yaml or deployments/alibaba/.
  • Verify: bash scripts/run-live-test.sh compose|remote
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
  • Example: docker compose -f deployments/compose.yaml ps
  • API:  http://127.0.0.1:32500/health
  • UI:   http://127.0.0.1:32501
"""
    if runtime == "none":
        return """
Dependencies installed; no services were started.
  • Example manual API: see docs/01-quickstart.md
  • Example proof:      bash scripts/run-real-test.sh
"""
    return """
After install — two terminals from the pack root (directory with install.sh):

  Terminal 1 (API):
    set -a && source .env && set +a
    PYTHONPATH=backend/change-society-service/src \\
      .venv/bin/python -m uvicorn change_society.main:app --host 127.0.0.1 --port 32500

  Terminal 2 (demo UI):
    cd frontend && npm run dev
    Open http://localhost:32501

  Automated proof (no browser):
    bash scripts/run-real-test.sh
"""
