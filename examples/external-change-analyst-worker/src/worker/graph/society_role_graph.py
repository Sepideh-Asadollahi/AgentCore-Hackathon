from __future__ import annotations

from typing import Any, TYPE_CHECKING

from agentcore_agent_sdk import AgentCoreExecutionTask, LangGraphMessageTranslator, UniversalAgentMessage

if TYPE_CHECKING:
    from ..settings import Settings

from ..qwen_client import complete_structured
from ..schemas import ROLE_ALIASES, SCHEMA_BY_TITLE
from .change_analyst_graph import build_change_analyst_graph, run_graph
from .runtime import compile_linear

ROLE_SCHEMA: dict[str, str] = {
    "context_scout": "ContextOutput",
    "change_analyst": "RoleOutput",
    "impact_analyst": "RoleOutput",
    "policy_guardian": "RoleOutput",
    "coordinator_judge": "JudgeOutput",
    "frontend_delivery_lead": "FrontendDeliveryOutput",
}


def normalize_role(role: str) -> str:
    key = role.strip().lower().replace("-", "_")
    return ROLE_ALIASES.get(key, key)


def task_to_graph_state(task: AgentCoreExecutionTask) -> dict[str, Any]:
    envelope = LangGraphMessageTranslator().from_universal(
        UniversalAgentMessage(
            protocol_version="1.0",
            message_id=task.ticket_id,
            message_type="task_assignment",
            tenant_id="external-worker",
            workspace_id="external-worker",
            project_id="external-worker",
            run_id=task.ticket_id,
            correlation_id=task.correlation_id,
            sender_role="coordinator",
            recipient_role=task.role,
            capability=task.role,
            task_ref=task.ticket_id,
            intent="execute",
            status="assigned",
            payload={"content": task.user_prompt},
            evidence_refs=(),
            confidence=1.0,
            risk_level="medium",
            requested_next_action="complete_ticket",
            idempotency_key=task.ticket_id,
        )
    )
    schema_title = str(task.output_schema.get("title", ROLE_SCHEMA.get(normalize_role(task.role), "RoleOutput")))
    return {
        "role": task.role,
        "normalized_role": normalize_role(task.role),
        "system_prompt": task.system_prompt,
        "user_prompt": task.user_prompt,
        "output_schema": task.output_schema,
        "schema_title": schema_title,
        "agentcore_envelope": envelope,
    }


def _make_qwen_step(settings: Settings, schema_name: str):
    def step(state: dict[str, Any]) -> dict[str, Any]:
        schema_model = SCHEMA_BY_TITLE[schema_name]
        system = state["system_prompt"]
        user = state["user_prompt"]
        if state.get("graph_draft") is not None:
            user += "\nLangGraph draft:\n" + str(state["graph_draft"])
        validated = complete_structured(settings, system, user, schema_model)
        payload = validated.model_dump() if hasattr(validated, "model_dump") else dict(validated)
        return {"output": payload}

    return step


def _change_specialist_step(state: dict[str, Any]) -> dict[str, Any]:
    graph = build_change_analyst_graph()
    draft = run_graph(
        graph,
        role=state["role"],
        system_prompt=state["system_prompt"],
        user_prompt=state["user_prompt"],
        schema_title=state["schema_title"],
    )
    return {"graph_draft": draft}


def _offline_change_output(state: dict[str, Any]) -> dict[str, Any]:
    return {"output": SCHEMA_BY_TITLE["RoleOutput"].model_validate(state["graph_draft"]).model_dump()}


class RoleGraphRegistry:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._cache: dict[str, Any] = {}

    def get(self, role: str) -> Any:
        normalized = normalize_role(role)
        if normalized not in self._cache:
            self._cache[normalized] = self._build(normalized)
        return self._cache[normalized]

    def _build(self, normalized: str) -> Any:
        settings = self._settings
        schema = ROLE_SCHEMA[normalized]
        if normalized == "change_analyst":
            if settings.live_mode:
                return compile_linear(_change_specialist_step, _make_qwen_step(settings, "RoleOutput"))
            return compile_linear(_change_specialist_step, _offline_change_output)
        if not settings.live_mode:
            raise ValueError(f"{normalized} requires WORKER_LIVE_MODE=1 (LangGraph + live Qwen)")
        return compile_linear(_make_qwen_step(settings, schema))

    def invoke(self, task: AgentCoreExecutionTask) -> dict[str, Any]:
        compiled = self.get(task.role)
        result = compiled.invoke(task_to_graph_state(task))
        output = result.get("output")
        if not output:
            raise ValueError(f"LangGraph produced no output for role {task.role}")
        return output
