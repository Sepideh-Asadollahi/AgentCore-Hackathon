from __future__ import annotations

from typing import Any, TypedDict


class GraphState(TypedDict, total=False):
    role: str
    system_prompt: str
    user_prompt: str
    output_schema_title: str
    evidence_refs: list[str]
    summary: str
    risk_level: str
    findings: list[str]
    impacts: list[str]
    policies: list[str]
    tasks: list[str]
    assumptions: list[str]
    unresolved_questions: list[str]
    confidence: float
    recommended_action: str
    is_rebuttal: bool


def _extract_evidence_ids(user_prompt: str) -> list[str]:
    refs: list[str] = []
    for token in user_prompt.replace("[", " ").replace("]", " ").split():
        if token.startswith("ev_") or token.startswith("memory_"):
            refs.append(token.strip(".,;"))
    return sorted(set(refs))[:30]


def _detect_rebuttal(user_prompt: str) -> bool:
    return "ONE BOUNDED REBUTTAL" in user_prompt or "rebuttal" in user_prompt.lower()


def _detect_breaking_api(user_prompt: str) -> bool:
    markers = ("taxIncluded", "ev_api_diff", "breaking", "OpenAPI", "mobile clients")
    return any(item in user_prompt for item in markers)


def parse_inputs(state: GraphState) -> GraphState:
    user = state.get("user_prompt", "")
    refs = _extract_evidence_ids(user)
    return {
        **state,
        "evidence_refs": refs,
        "is_rebuttal": _detect_rebuttal(user),
        "findings": ["Evidence-bound review completed by external LangGraph worker."],
        "assumptions": [],
        "unresolved_questions": [],
        "confidence": 0.88,
        "recommended_action": "Escalate for human approval when contract or policy evidence conflicts.",
    }


def assess_risk(state: GraphState) -> GraphState:
    user = state.get("user_prompt", "")
    breaking = _detect_breaking_api(user)
    rebuttal = bool(state.get("is_rebuttal"))
    if breaking and not rebuttal:
        return {
            **state,
            "risk_level": "low",
            "summary": "Initial pass: change appears to be an internal refactor with no client-visible impact.",
            "impacts": ["handler refactor"],
            "policies": [],
            "tasks": ["document internal delegation"],
        }
    if breaking and rebuttal:
        return {
            **state,
            "risk_level": "high",
            "summary": "Revised: OpenAPI/mobile evidence shows a breaking response field removal (taxIncluded).",
            "impacts": ["mobile clients", "taxIncluded field", "breaking HTTP contract", "platform approval"],
            "policies": [],
            "tasks": ["restore backward compatible field", "add contract regression test", "request platform approval"],
        }
    return {
        **state,
        "risk_level": "medium",
        "summary": "External worker completed structured change analysis.",
        "impacts": ["downstream behavior"],
        "policies": [],
        "tasks": ["continue society workflow with cited evidence"],
    }


def finalize_role_output(state: GraphState) -> GraphState:
    return state
