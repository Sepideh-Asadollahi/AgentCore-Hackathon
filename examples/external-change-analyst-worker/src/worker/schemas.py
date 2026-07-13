from __future__ import annotations

import sys
from pathlib import Path

_HACKATHON = Path(__file__).resolve().parents[4]
_BACKEND = _HACKATHON / "backend" / "change-society-service" / "src"
if _BACKEND.is_dir():
    path = str(_BACKEND)
    if path not in sys.path:
        sys.path.insert(0, path)

from change_society.contracts.messages import (  # noqa: E402
    ContextOutput,
    FrontendDeliveryOutput,
    JudgeOutput,
    RoleOutput,
)

SCHEMA_BY_TITLE = {
    "RoleOutput": RoleOutput,
    "ContextOutput": ContextOutput,
    "JudgeOutput": JudgeOutput,
    "FrontendDeliveryOutput": FrontendDeliveryOutput,
}

ROLE_ALIASES = {
    "context_scout": "context_scout",
    "change_analyst": "change_analyst",
    "change-analyst": "change_analyst",
    "impact_analyst": "impact_analyst",
    "policy_guardian": "policy_guardian",
    "coordinator_judge": "coordinator_judge",
    "frontend_delivery_lead": "frontend_delivery_lead",
}
