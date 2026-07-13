from __future__ import annotations

from typing import Any

from ..contracts.messages import RoleOutput
from .ports import ModelClient, Scenario


def _matches(expected: tuple[str, ...], actual: list[str]) -> tuple[int, int]:
    normalized = " ".join(actual).lower()
    found = sum(1 for item in expected if all(token in normalized for token in item.lower().split()))
    return found, len(expected)


def score_output(scenario: Scenario, output: dict[str, Any]) -> dict[str, Any]:
    impact_found, impact_total = _matches(scenario.expected_impacts, list(output.get("impacts", [])))
    policy_found, policy_total = _matches(scenario.required_policies, list(output.get("policies", [])))
    task_found, task_total = _matches(scenario.required_tasks, list(output.get("tasks", [])))
    evidence = set(output.get("evidence_refs", []))
    unsupported = sum(1 for _ in output.get("findings", []) if not evidence)
    return {
        "critical_impact_recall": impact_found / impact_total if impact_total else 1.0,
        "policy_match_recall": policy_found / policy_total if policy_total else 1.0,
        "task_completeness": task_found / task_total if task_total else 1.0,
        "unsupported_claim_count": unsupported,
        "raw": {
            "impact_found": impact_found, "impact_total": impact_total,
            "policy_found": policy_found, "policy_total": policy_total,
            "task_found": task_found, "task_total": task_total,
        },
    }


def run_single_agent_baseline(model: ModelClient, scenario: Scenario, request_text: str, evidence_text: str) -> tuple[dict[str, Any], dict[str, Any]]:
    system = (
        "You are a single general software-change reviewer. Analyze the request and evidence. "
        "Return only JSON matching the required schema. Cite evidence IDs and do not invent facts."
    )
    result = model.complete("single_agent_baseline", system, f"REQUEST:\n{request_text}\nEVIDENCE:\n{evidence_text}", RoleOutput)
    scored = score_output(scenario, result.payload)
    scored.update({"input_tokens": result.input_tokens, "output_tokens": result.output_tokens, "duration_ms": result.duration_ms})
    return result.payload, scored
