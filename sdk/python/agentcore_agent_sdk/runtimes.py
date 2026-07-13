from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Mapping, Protocol

from .protocol import ProtocolValidationError, UniversalAgentMessage


class Invokable(Protocol):
    def invoke(self, input: Any, *args: Any, **kwargs: Any) -> Any: ...


class LangChainMessageTranslator:
    """Translator for LangChain/LangGraph message-shaped state without importing either framework."""

    runtime_name = "langchain"

    def to_universal(self, payload: Mapping[str, Any], context: Mapping[str, Any]) -> UniversalAgentMessage:
        messages = payload.get("messages", [])
        content = payload.get("output")
        if content is None and messages:
            last = messages[-1]
            content = getattr(last, "content", None) if not isinstance(last, Mapping) else last.get("content")
        return UniversalAgentMessage(
            protocol_version="1.0", message_id=str(context["message_id"]), message_type=str(context["message_type"]),
            tenant_id=str(context["tenant_id"]), workspace_id=str(context["workspace_id"]), project_id=str(context["project_id"]),
            run_id=str(context["run_id"]), correlation_id=str(context["correlation_id"]),
            sender_role=str(context["sender_role"]), recipient_role=str(context["recipient_role"]),
            capability=str(context["capability"]), task_ref=str(context["task_ref"]), intent=str(context["intent"]),
            status=str(context.get("status", "completed")), payload={"content": content, "runtime_state": dict(payload)},
            evidence_refs=tuple(context.get("evidence_refs", ())), confidence=float(context.get("confidence", 0.5)),
            risk_level=str(context.get("risk_level", "medium")), requested_next_action=str(context.get("requested_next_action", "review")),
            idempotency_key=str(context.get("idempotency_key", context["message_id"])),
        )

    def from_universal(self, message: UniversalAgentMessage) -> Mapping[str, Any]:
        content = message.payload.get("content", message.payload)
        return {"messages": [{"role": "user", "content": content}], "agentcore": {
            "ticket_id": message.task_ref, "capability": message.capability, "correlation_id": message.correlation_id,
            "evidence_refs": list(message.evidence_refs), "intent": message.intent,
        }}


class LangGraphMessageTranslator(LangChainMessageTranslator):
    runtime_name = "langgraph"


@dataclass
class RunnableAgentBridge:
    """Runs a LangChain Runnable or compiled LangGraph as an AgentCore-managed worker."""

    runtime: Invokable
    input_mapper: Callable[[Mapping[str, Any]], Any] = lambda value: value
    output_mapper: Callable[[Any], Mapping[str, Any]] = lambda value: value if isinstance(value, Mapping) else {"output": value}

    def execute(self, universal_task: UniversalAgentMessage) -> Mapping[str, Any]:
        if universal_task.message_type != "task_assignment":
            raise ProtocolValidationError("runnable bridge accepts task_assignment messages only")
        runtime_input = self.input_mapper(LangChainMessageTranslator().from_universal(universal_task))
        return self.output_mapper(self.runtime.invoke(runtime_input))
