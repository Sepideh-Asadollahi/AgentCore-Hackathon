from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any

from .models import ConflictError, Scope, ValidationError


class AgentState(StrEnum):
    REGISTERED = "registered"
    ONLINE = "online"
    DEGRADED = "degraded"
    PAUSED = "paused"
    OFFLINE = "offline"
    REVOKED = "revoked"


class TicketState(StrEnum):
    CREATED = "created"
    ASSIGNED = "assigned"
    CLAIMED = "claimed"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    REVIEW = "review"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELED = "canceled"


TICKET_TRANSITIONS: dict[TicketState, set[TicketState]] = {
    TicketState.CREATED: {TicketState.ASSIGNED, TicketState.CANCELED},
    TicketState.ASSIGNED: {TicketState.CLAIMED, TicketState.CREATED, TicketState.CANCELED},
    TicketState.CLAIMED: {TicketState.IN_PROGRESS, TicketState.BLOCKED, TicketState.CANCELED},
    TicketState.IN_PROGRESS: {TicketState.BLOCKED, TicketState.REVIEW, TicketState.FAILED, TicketState.CANCELED},
    TicketState.BLOCKED: {TicketState.ASSIGNED, TicketState.IN_PROGRESS, TicketState.FAILED, TicketState.CANCELED},
    TicketState.REVIEW: {TicketState.COMPLETED, TicketState.IN_PROGRESS, TicketState.FAILED},
    TicketState.COMPLETED: set(), TicketState.FAILED: set(), TicketState.CANCELED: set(),
}


@dataclass
class ManagedAgent:
    agent_id: str
    scope: Scope
    name: str
    provider: str
    adapter_type: str
    capabilities: tuple[str, ...]
    state: AgentState
    created_at: str
    updated_at: str
    endpoint: str | None = None
    role: str | None = None
    description: str = ""
    last_heartbeat_at: str | None = None
    active_ticket_count: int = 0
    version: int = 1
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.agent_id or not self.name or not self.adapter_type or not self.capabilities:
            raise ValidationError("agent identity, name, adapter_type, and capabilities are required")

    def supports(self, capability: str) -> bool:
        return capability in self.capabilities and self.state == AgentState.ONLINE

    def public(self) -> dict[str, Any]:
        return {
            "agent_id": self.agent_id, "tenant_id": self.scope.tenant_id, "workspace_id": self.scope.workspace_id,
            "project_id": self.scope.project_id, "name": self.name, "provider": self.provider,
            "adapter_type": self.adapter_type, "capabilities": list(self.capabilities), "state": self.state.value,
            "description": self.description, "last_heartbeat_at": self.last_heartbeat_at,
            "active_ticket_count": self.active_ticket_count, "version": self.version,
            "created_at": self.created_at, "updated_at": self.updated_at, "metadata": self.metadata,
        }


@dataclass(frozen=True)
class TicketEvent:
    event_id: str
    event_type: str
    from_state: str | None
    to_state: str
    actor_id: str
    occurred_at: str
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentTicket:
    ticket_id: str
    scope: Scope
    run_id: str
    title: str
    capability: str
    input_payload: dict[str, Any]
    acceptance_criteria: tuple[str, ...]
    state: TicketState
    priority: int
    created_by: str
    correlation_id: str
    created_at: str
    updated_at: str
    assigned_agent_id: str | None = None
    claimed_at: str | None = None
    output_payload: dict[str, Any] | None = None
    error: dict[str, Any] | None = None
    version: int = 1
    events: list[TicketEvent] = field(default_factory=list)
    execution_metrics: dict[str, Any] = field(default_factory=dict)

    def transition(self, target: TicketState, actor_id: str, at: str, event_id: str, details: dict[str, Any] | None = None) -> None:
        if target not in TICKET_TRANSITIONS[self.state]:
            raise ConflictError(f"invalid ticket transition: {self.state.value} -> {target.value}")
        previous = self.state
        self.state = target
        self.updated_at = at
        self.version += 1
        self.events.append(TicketEvent(event_id, "ticket_state_changed", previous.value, target.value, actor_id, at, details or {}))

    def public(self) -> dict[str, Any]:
        return {
            "ticket_id": self.ticket_id, "tenant_id": self.scope.tenant_id, "workspace_id": self.scope.workspace_id,
            "project_id": self.scope.project_id, "run_id": self.run_id, "title": self.title,
            "capability": self.capability, "input_payload": self.input_payload,
            "acceptance_criteria": list(self.acceptance_criteria), "state": self.state.value,
            "priority": self.priority, "created_by": self.created_by, "correlation_id": self.correlation_id,
            "assigned_agent_id": self.assigned_agent_id, "claimed_at": self.claimed_at,
            "output_payload": self.output_payload, "error": self.error, "version": self.version,
            "created_at": self.created_at, "updated_at": self.updated_at,
            "events": [event.__dict__.copy() for event in self.events], "execution_metrics": self.execution_metrics,
        }
