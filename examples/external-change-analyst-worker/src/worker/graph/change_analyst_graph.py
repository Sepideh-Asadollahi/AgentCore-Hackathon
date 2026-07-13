from __future__ import annotations

from typing import Any, Callable


class _LinearCompiledGraph:
    """Runs the same node pipeline as LangGraph when langgraph is not installed (tests / minimal venv)."""

    def __init__(self, steps: tuple[Callable[[dict[str, Any]], dict[str, Any]], ...]):
        self._steps = steps

    def invoke(self, state: dict[str, Any]) -> dict[str, Any]:
        current = dict(state)
        for step in self._steps:
            current = {**current, **step(current)}
        return current


def build_change_analyst_graph() -> Any:
    """Compiled LangGraph for change_analyst RoleOutput (linear fallback if langgraph missing)."""
    from .nodes import assess_risk, finalize_role_output, parse_inputs

    try:
        from langgraph.graph import END, START, StateGraph
    except ImportError:
        return _LinearCompiledGraph((parse_inputs, assess_risk, finalize_role_output))

    graph = StateGraph(dict)
    graph.add_node("parse_inputs", parse_inputs)
    graph.add_node("assess_risk", assess_risk)
    graph.add_node("finalize", finalize_role_output)
    graph.add_edge(START, "parse_inputs")
    graph.add_edge("parse_inputs", "assess_risk")
    graph.add_edge("assess_risk", "finalize")
    graph.add_edge("finalize", END)
    return graph.compile()


def run_graph(compiled: Any, *, role: str, system_prompt: str, user_prompt: str, schema_title: str) -> dict[str, Any]:
    result = compiled.invoke(
        {
            "role": role,
            "system_prompt": system_prompt,
            "user_prompt": user_prompt,
            "output_schema_title": schema_title,
        }
    )
    return {
        "summary": result.get("summary", "External analysis complete."),
        "risk_level": result.get("risk_level", "medium"),
        "findings": result.get("findings", []),
        "impacts": result.get("impacts", []),
        "policies": list(result.get("policies", [])),
        "tasks": result.get("tasks", []),
        "evidence_refs": result.get("evidence_refs", []),
        "assumptions": result.get("assumptions", []),
        "unresolved_questions": result.get("unresolved_questions", []),
        "confidence": float(result.get("confidence", 0.85)),
        "recommended_action": result.get("recommended_action", "Review with society coordinator."),
    }
