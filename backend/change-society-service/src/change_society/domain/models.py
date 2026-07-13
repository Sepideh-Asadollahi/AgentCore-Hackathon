from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class SocietyError(Exception):
    def __init__(self, code: str, category: str, message: str, retryable: bool = False, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.code = code
        self.category = category
        self.message = message
        self.retryable = retryable
        self.details = details or {}


class ValidationError(SocietyError):
    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__("validation_error", "validation_error", message, False, details)


class ConflictError(SocietyError):
    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__("conflict_error", "conflict_error", message, False, details)


class NotFoundError(SocietyError):
    def __init__(self, message: str = "Society run was not found."):
        super().__init__("society_run_not_found", "not_found_error", message)


class DependencyError(SocietyError):
    def __init__(self, code: str, message: str, retryable: bool = True):
        super().__init__(code, "dependency_error", message, retryable)


class PolicyError(SocietyError):
    def __init__(self, message: str):
        super().__init__("approval_required", "policy_error", message)


class RunState(StrEnum):
    ACCEPTED = "accepted"
    GATHERING_CONTEXT = "gathering_context"
    DECOMPOSING = "decomposing"
    ANALYZING = "analyzing"
    RECONCILING = "reconciling"
    AWAITING_APPROVAL = "awaiting_approval"
    REWORK_REQUESTED = "rework_requested"
    FINALIZING = "finalizing"
    COMPLETED = "completed"
    REJECTED = "rejected"
    FAILED = "failed"
    CANCELED = "canceled"


class Role(StrEnum):
    COORDINATOR = "coordinator"
    CONTEXT_SCOUT = "context_scout"
    CHANGE_ANALYST = "change_analyst"
    IMPACT_ANALYST = "impact_analyst"
    POLICY_GUARDIAN = "policy_guardian"
    FRONTEND_DELIVERY_LEAD = "frontend_delivery_lead"


class RiskLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


RISK_ORDER = {RiskLevel.LOW: 0, RiskLevel.MEDIUM: 1, RiskLevel.HIGH: 2, RiskLevel.CRITICAL: 3}


@dataclass(frozen=True)
class Scope:
    tenant_id: str
    workspace_id: str
    project_id: str

    def __post_init__(self) -> None:
        if not all(value and value.strip() for value in (self.tenant_id, self.workspace_id, self.project_id)):
            raise ValidationError("tenant_id, workspace_id, and project_id are required")


@dataclass(frozen=True)
class Evidence:
    evidence_id: str
    kind: str
    title: str
    content: str
    status: str = "active"
    restricted: bool = False
    tags: tuple[str, ...] = ()

    def public(self, include_content: bool = True) -> dict[str, Any]:
        return {
            "evidence_id": self.evidence_id,
            "kind": self.kind,
            "title": self.title,
            "content": self.content if include_content and not self.restricted else "[REDACTED]",
            "status": self.status,
            "restricted": self.restricted,
            "tags": list(self.tags),
        }


@dataclass
class AgentMessage:
    protocol_version: str
    message_id: str
    message_type: str
    scope: Scope
    run_id: str
    correlation_id: str
    causation_id: str | None
    sender_role: Role
    recipient_role: Role
    capability: str
    task_ref: str
    intent: str
    status: str
    payload: dict[str, Any]
    evidence_refs: list[str]
    assumptions: list[str]
    confidence: float
    risk_level: RiskLevel
    conflicts: list[str]
    unresolved_questions: list[str]
    requested_next_action: str
    created_at: str
    idempotency_key: str
    token_usage: dict[str, int] = field(default_factory=dict)

    def public(self) -> dict[str, Any]:
        value = self.__dict__.copy()
        value["scope"] = self.scope.__dict__.copy()
        value["sender_role"] = self.sender_role.value
        value["recipient_role"] = self.recipient_role.value
        value["risk_level"] = self.risk_level.value
        return value


@dataclass
class ConflictRecord:
    conflict_id: str
    topic: str
    claim_a_message_id: str
    claim_b_message_id: str
    claim_a_risk: RiskLevel
    claim_b_risk: RiskLevel
    evidence_refs: list[str]
    status: str
    resolution: str | None = None
    rationale: str | None = None
    rebuttal_message_ids: list[str] = field(default_factory=list)

    def public(self) -> dict[str, Any]:
        return {
            **self.__dict__,
            "claim_a_risk": self.claim_a_risk.value,
            "claim_b_risk": self.claim_b_risk.value,
        }


@dataclass
class ApprovalDecision:
    approval_id: str
    run_version: int
    status: str
    requested_at: str
    evidence_digest: str
    decided_at: str | None = None
    decided_by: str | None = None
    reason: str | None = None


TRANSITIONS: dict[RunState, set[RunState]] = {
    RunState.ACCEPTED: {RunState.GATHERING_CONTEXT, RunState.CANCELED, RunState.FAILED},
    RunState.GATHERING_CONTEXT: {RunState.DECOMPOSING, RunState.FAILED, RunState.CANCELED},
    RunState.DECOMPOSING: {RunState.ANALYZING, RunState.FAILED, RunState.CANCELED},
    RunState.ANALYZING: {RunState.RECONCILING, RunState.FAILED, RunState.CANCELED},
    RunState.RECONCILING: {RunState.AWAITING_APPROVAL, RunState.FINALIZING, RunState.FAILED},
    RunState.AWAITING_APPROVAL: {RunState.FINALIZING, RunState.REJECTED, RunState.REWORK_REQUESTED, RunState.CANCELED},
    RunState.REWORK_REQUESTED: {RunState.ANALYZING, RunState.CANCELED},
    RunState.FINALIZING: {RunState.COMPLETED, RunState.FAILED},
    RunState.COMPLETED: set(), RunState.REJECTED: set(), RunState.FAILED: set(), RunState.CANCELED: set(),
}


@dataclass
class SocietyRun:
    run_id: str
    scope: Scope
    actor_id: str
    correlation_id: str
    request_text: str
    scenario_id: str
    state: RunState
    created_at: str
    updated_at: str
    version: int = 1
    messages: list[AgentMessage] = field(default_factory=list)
    conflicts: list[ConflictRecord] = field(default_factory=list)
    approval: ApprovalDecision | None = None
    final_result: dict[str, Any] | None = None
    metrics: dict[str, Any] = field(default_factory=dict)
    excluded_evidence: list[dict[str, str]] = field(default_factory=list)
    error: dict[str, Any] | None = None

    def transition(self, target: RunState, at: str) -> None:
        if target not in TRANSITIONS[self.state]:
            raise ConflictError(f"invalid run transition: {self.state.value} -> {target.value}")
        self.state = target
        self.updated_at = at
        self.version += 1

    def public(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "tenant_id": self.scope.tenant_id,
            "workspace_id": self.scope.workspace_id,
            "project_id": self.scope.project_id,
            "actor_id": self.actor_id,
            "correlation_id": self.correlation_id,
            "request_text": self.request_text,
            "scenario_id": self.scenario_id,
            "state": self.state.value,
            "version": self.version,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "message_count": len(self.messages),
            "conflict_count": len(self.conflicts),
            "approval": None if self.approval is None else self.approval.__dict__.copy(),
            "final_result": self.final_result,
            "metrics": self.metrics,
            "excluded_evidence": self.excluded_evidence,
            "error": self.error,
        }
