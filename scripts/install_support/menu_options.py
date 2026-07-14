from __future__ import annotations

from .types import ChoiceOption

PROFILE_OPTIONS: tuple[ChoiceOption, ...] = (
    ChoiceOption(
        "demo",
        "Local judged demo (fake model + in-memory store, no cloud keys)",
        "bash install.sh --profile demo",
    ),
    ChoiceOption(
        "verify",
        "Demo install + automated end-to-end proof script",
        "bash install.sh --profile verify",
    ),
    ChoiceOption(
        "production",
        "Print Qwen / PostgreSQL / Alibaba deployment hints only (no venv/npm)",
        "bash install.sh --profile production",
    ),
)

RUNTIME_OPTIONS: tuple[ChoiceOption, ...] = (
    ChoiceOption(
        "manual",
        "You start API + UI in two terminals (best for judges / first look)",
        "Terminal 1: set -a && source .env && set +a && "
        "PYTHONPATH=backend/change-society-service/src "
        ".venv/bin/python -m uvicorn change_society.main:app --host 127.0.0.1 --port 32500\n"
        "Terminal 2: cd frontend && npm run dev\n"
        "Browser: http://localhost:3000",
    ),
    ChoiceOption(
        "systemd",
        "Linux user systemd units (API + production-built UI, survives reboot with linger)",
        "systemctl --user status change-society-api.service\n"
        "systemctl --user status change-society-web.service\n"
        "journalctl --user -u change-society-api -f",
    ),
    ChoiceOption(
        "docker",
        "Full stack via Docker Compose (PostgreSQL + API + web; needs secrets in .env)",
        "docker compose -f deployments/compose.yaml ps\n"
        "curl -s http://127.0.0.1:32500/health",
    ),
    ChoiceOption(
        "none",
        "Install dependencies only; do not start any runtime",
        "bash ../tests/e2e/change-society/run-real-test.sh   # when you are ready",
    ),
)
