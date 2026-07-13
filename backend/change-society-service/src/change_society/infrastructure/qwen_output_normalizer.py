from __future__ import annotations

import json
import re
from typing import Any

from pydantic import BaseModel

from ..contracts.messages import ContextOutput, FrontendDeliveryOutput, JudgeOutput, RoleOutput

_RISK_LEVELS = {"low", "medium", "high", "critical"}
_VERDICTS = {"accept_low_risk", "accept_high_risk", "escalate"}
_JSON_FENCE = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.IGNORECASE)


def extract_json_object(content: str) -> dict[str, Any]:
    text = content.strip()
    fence = _JSON_FENCE.search(text)
    if fence:
        text = fence.group(1).strip()
    parsed = json.loads(text)
    if not isinstance(parsed, dict):
        raise TypeError("expected JSON object")
    return parsed


def _string_list(value: Any, *, max_items: int) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list):
        return []
    items: list[str] = []
    for item in value:
        if item is None:
            continue
        text = str(item).strip()
        if text:
            items.append(text[:500])
    return items[:max_items]


def _confidence(value: Any) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.75
    if number > 1.0:
        number = number / 100.0
    return max(0.0, min(1.0, number))


def _risk_level(value: Any) -> str:
    if not isinstance(value, str):
        return "medium"
    normalized = value.strip().lower()
    if normalized in _RISK_LEVELS:
        return normalized
    if "crit" in normalized:
        return "critical"
    if "high" in normalized:
        return "high"
    if "low" in normalized:
        return "low"
    return "medium"


def _min_text(value: Any, *, minimum: int, fallback: str, maximum: int = 2000) -> str:
    text = str(value).strip() if value is not None else ""
    if len(text) < minimum:
        text = fallback
    return text[:maximum]


def _allowed_keys(output_schema: type[Any]) -> set[str]:
    if not isinstance(output_schema, type) or not issubclass(output_schema, BaseModel):
        return set()
    return set(output_schema.model_fields.keys())


def normalize_model_payload(parsed: dict[str, Any], output_schema: type[Any]) -> dict[str, Any]:
    allowed = _allowed_keys(output_schema)
    data = {key: value for key, value in parsed.items() if key in allowed}

    if output_schema is JudgeOutput:
        data["verdict"] = data.get("verdict") if data.get("verdict") in _VERDICTS else "accept_high_risk"
        data["final_risk_level"] = _risk_level(data.get("final_risk_level"))
        data["rationale"] = _min_text(data.get("rationale"), minimum=3, fallback="Evidence-backed reconciliation.")
        data["rejected_position"] = _min_text(data.get("rejected_position"), minimum=2, fallback="Prior specialist claim.", maximum=1000)
        data["accepted_evidence_refs"] = _string_list(data.get("accepted_evidence_refs"), max_items=30)
        data["required_approvers"] = _string_list(data.get("required_approvers"), max_items=10) or ["product"]
        data["confidence"] = _confidence(data.get("confidence"))
        return data

    if output_schema is FrontendDeliveryOutput:
        data["summary"] = _min_text(data.get("summary"), minimum=3, fallback="Frontend team handoff required.")
        data["team_queue"] = "frontend"
        data["priority"] = _risk_level(data.get("priority"))
        data["ui_changes"] = _string_list(data.get("ui_changes"), max_items=20)
        data["ux_review_items"] = _string_list(data.get("ux_review_items"), max_items=20)
        data["api_client_updates"] = _string_list(data.get("api_client_updates"), max_items=20)
        data["frontend_tasks"] = _string_list(data.get("frontend_tasks"), max_items=20)
        data["design_artifacts_needed"] = _string_list(data.get("design_artifacts_needed"), max_items=20)
        data["evidence_refs"] = _string_list(data.get("evidence_refs"), max_items=30)
        data["confidence"] = _confidence(data.get("confidence"))
        data["recommended_action"] = _min_text(
            data.get("recommended_action"),
            minimum=2,
            fallback="Schedule frontend/UI review before release.",
            maximum=500,
        )
        return data

    # RoleOutput and ContextOutput share the role fields.
    data["summary"] = _min_text(data.get("summary"), minimum=3, fallback="Evidence-backed specialist analysis.")
    data["risk_level"] = _risk_level(data.get("risk_level"))
    data["findings"] = _string_list(data.get("findings"), max_items=20)
    data["impacts"] = _string_list(data.get("impacts"), max_items=20)
    data["policies"] = _string_list(data.get("policies"), max_items=20)
    data["tasks"] = _string_list(data.get("tasks"), max_items=20)
    data["evidence_refs"] = _string_list(data.get("evidence_refs"), max_items=30)
    data["assumptions"] = _string_list(data.get("assumptions"), max_items=15)
    data["unresolved_questions"] = _string_list(data.get("unresolved_questions"), max_items=15)
    data["confidence"] = _confidence(data.get("confidence"))
    data["recommended_action"] = _min_text(
        data.get("recommended_action"),
        minimum=2,
        fallback="Continue with evidence-backed review.",
        maximum=500,
    )

    if output_schema is ContextOutput:
        included = _string_list(data.get("included_evidence"), max_items=30)
        if not included:
            included = list(data["evidence_refs"])
        data["included_evidence"] = included
        excluded_raw = data.get("excluded_evidence")
        excluded: list[dict[str, str]] = []
        if isinstance(excluded_raw, list):
            for item in excluded_raw[:30]:
                if isinstance(item, dict):
                    evidence_id = str(item.get("evidence_id", "")).strip()
                    reason = str(item.get("reason", "excluded")).strip() or "excluded"
                    if evidence_id:
                        excluded.append({"evidence_id": evidence_id, "reason": reason[:200]})
                elif isinstance(item, str) and item.strip():
                    excluded.append({"evidence_id": item.strip(), "reason": "excluded"})
        data["excluded_evidence"] = excluded

    return data


def validate_normalized_payload(parsed: dict[str, Any], output_schema: type[Any]) -> BaseModel:
    normalized = normalize_model_payload(parsed, output_schema)
    return output_schema.model_validate(normalized)
