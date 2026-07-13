from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, Protocol


class ProtocolValidationError(ValueError):
    pass


@dataclass(frozen=True)
class UniversalAgentMessage:
    """Runtime-neutral AgentCore lingua franca. Payload remains schema-owned by message_type."""

    protocol_version: str
    message_id: str
    message_type: str
    tenant_id: str
    workspace_id: str
    project_id: str
    run_id: str
    correlation_id: str
    sender_role: str
    recipient_role: str
    capability: str
    task_ref: str
    intent: str
    status: str
    payload: Mapping[str, Any]
    evidence_refs: tuple[str, ...] = ()
    causation_id: str | None = None
    confidence: float = 0.5
    risk_level: str = "medium"
    requested_next_action: str = "none"
    idempotency_key: str = ""
    extensions: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        required = (self.message_id, self.message_type, self.tenant_id, self.workspace_id, self.project_id,
                    self.run_id, self.correlation_id, self.sender_role, self.recipient_role, self.capability,
                    self.task_ref, self.intent, self.status)
        if self.protocol_version != "1.0" or not all(str(value).strip() for value in required):
            raise ProtocolValidationError("Universal Agent JSON v1 identity and routing fields are required")
        if not 0 <= self.confidence <= 1:
            raise ProtocolValidationError("confidence must be between zero and one")
        if self.risk_level not in {"low", "medium", "high", "critical"}:
            raise ProtocolValidationError("risk_level is invalid")

    def to_dict(self) -> dict[str, Any]:
        return {**self.__dict__, "payload": dict(self.payload), "evidence_refs": list(self.evidence_refs),
                "extensions": dict(self.extensions)}

    @classmethod
    def from_dict(cls, value: Mapping[str, Any]) -> "UniversalAgentMessage":
        known = set(cls.__dataclass_fields__)
        data = {key: value[key] for key in known if key in value}
        data["evidence_refs"] = tuple(data.get("evidence_refs", ()))
        data["extensions"] = {**dict(data.get("extensions", {})), **{key: item for key, item in value.items() if key not in known}}
        return cls(**data)


class RuntimeTranslator(Protocol):
    runtime_name: str
    def to_universal(self, payload: Mapping[str, Any], context: Mapping[str, Any]) -> UniversalAgentMessage: ...
    def from_universal(self, message: UniversalAgentMessage) -> Mapping[str, Any]: ...


class TranslatorRegistry:
    def __init__(self, translators: tuple[RuntimeTranslator, ...]):
        self._translators = {item.runtime_name: item for item in translators}

    def get(self, runtime_name: str) -> RuntimeTranslator:
        try:
            return self._translators[runtime_name]
        except KeyError as exc:
            raise ProtocolValidationError(f"translator is not registered: {runtime_name}") from exc

    def normalize(self, runtime_name: str, payload: Mapping[str, Any], context: Mapping[str, Any]) -> UniversalAgentMessage:
        return self.get(runtime_name).to_universal(payload, context)

    def render(self, runtime_name: str, message: UniversalAgentMessage) -> Mapping[str, Any]:
        return self.get(runtime_name).from_universal(message)
