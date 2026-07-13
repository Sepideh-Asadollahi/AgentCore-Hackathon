from __future__ import annotations

from typing import Any

FRONTEND_DELIVERY_CAPABILITY = "coordinate_frontend_ui_delivery"

_FRONTEND_KEYWORDS = (
    "mobile",
    "client",
    "ui",
    "ux",
    "checkout",
    "taxincluded",
    "api",
    "contract",
    "openapi",
    "login",
    "auth",
    "password",
    "billing",
    "price",
    "payment",
    "retry",
    "duplicate",
    "response",
    "json",
    "handler",
    "employee",
    "portal",
    "hr",
    "payroll",
    "pii",
    "gdpr",
    "vendor",
    "sso",
    "offboarding",
)


def _corpus(*parts: Any) -> str:
    return " ".join(str(item).lower().replace("_", " ") for item in parts if item)


def analyze_frontend_signals(
    *,
    scenario_id: str,
    impacts: list[str],
    tasks: list[str],
    policies: list[str],
    evidence_refs: list[str],
) -> dict[str, Any]:
    text = _corpus(scenario_id, *impacts, *tasks, *policies, *evidence_refs)
    matched = sorted({keyword for keyword in _FRONTEND_KEYWORDS if keyword in text})
    scenario_hints = {
        "checkout-api-refactor": ("api contract", "mobile clients", "taxIncluded field"),
        "pricing-refactor": ("checkout totals display", "customer-visible pricing copy"),
        "password-migration": ("login and session UI", "password change flows"),
        "payment-memory": ("payment retry UX", "duplicate charge messaging"),
        "hr-compensation-export": ("employee portal export UI", "PII masking in manager CSV"),
        "gdpr-erasure-automation": ("privacy center erasure status UI", "retention exception messaging"),
        "vendor-access-offboarding": ("SSO offboarding admin UI", "HR-Security joint workflow screens"),
    }
    hints = list(scenario_hints.get(scenario_id, ()))
    frontend_work_required = bool(matched) or scenario_id in scenario_hints
    return {
        "frontend_work_required": frontend_work_required,
        "matched_keywords": matched,
        "scenario_ui_hints": hints,
        "team_queue": "frontend",
    }


def build_frontend_delivery_user_prompt(
    *,
    scenario_id: str,
    request_text: str,
    signals: dict[str, Any],
    impacts: list[str],
    tasks: list[str],
    evidence_refs: list[str],
) -> str:
    return (
        f"SCENARIO_ID:{scenario_id}\n"
        f"REQUEST:{request_text}\n"
        f"FRONTEND_SIGNALS:{signals}\n"
        f"IMPACTS:{impacts}\n"
        f"TASKS:{tasks}\n"
        f"EVIDENCE_REFS:{evidence_refs}\n"
        "Produce a frontend team handoff. Backend/platform teams may have already merged code; "
        "the frontend team must learn what UI, UX, API client, and design work is required."
    )
