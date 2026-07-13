from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RoleOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary: str = Field(min_length=3, max_length=2000)
    risk_level: Literal["low", "medium", "high", "critical"]
    findings: list[str] = Field(default_factory=list, max_length=20)
    impacts: list[str] = Field(default_factory=list, max_length=20)
    policies: list[str] = Field(default_factory=list, max_length=20)
    tasks: list[str] = Field(default_factory=list, max_length=20)
    evidence_refs: list[str] = Field(default_factory=list, max_length=30)
    assumptions: list[str] = Field(default_factory=list, max_length=15)
    unresolved_questions: list[str] = Field(default_factory=list, max_length=15)
    confidence: float = Field(ge=0, le=1)
    recommended_action: str = Field(min_length=2, max_length=500)


class ContextOutput(RoleOutput):
    included_evidence: list[str] = Field(default_factory=list, max_length=30)
    excluded_evidence: list[dict[str, str]] = Field(default_factory=list, max_length=30)


class JudgeOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    verdict: Literal["accept_low_risk", "accept_high_risk", "escalate"]
    final_risk_level: Literal["low", "medium", "high", "critical"]
    rationale: str = Field(min_length=3, max_length=2000)
    accepted_evidence_refs: list[str] = Field(default_factory=list, max_length=30)
    rejected_position: str = Field(min_length=2, max_length=1000)
    required_approvers: list[str] = Field(default_factory=list, max_length=10)
    confidence: float = Field(ge=0, le=1)


class FrontendDeliveryOutput(BaseModel):
    """Structured handoff from change society to the frontend team queue."""

    model_config = ConfigDict(extra="forbid")
    summary: str = Field(min_length=3, max_length=2000)
    team_queue: Literal["frontend"] = "frontend"
    priority: Literal["low", "medium", "high", "critical"]
    ui_changes: list[str] = Field(default_factory=list, max_length=20)
    ux_review_items: list[str] = Field(default_factory=list, max_length=20)
    api_client_updates: list[str] = Field(default_factory=list, max_length=20)
    frontend_tasks: list[str] = Field(default_factory=list, max_length=20)
    design_artifacts_needed: list[str] = Field(default_factory=list, max_length=20)
    evidence_refs: list[str] = Field(default_factory=list, max_length=30)
    confidence: float = Field(ge=0, le=1)
    recommended_action: str = Field(min_length=2, max_length=500)


class UniversalAgentJson(BaseModel):
    model_config = ConfigDict(extra="forbid")
    protocol_version: Literal["1.0"]
    message_id: str = Field(min_length=3)
    message_type: Literal[
        "task_assignment", "specialist_finding", "rebuttal_request", "rebuttal_response",
        "coordinator_decision", "approval_requested", "approval_decided", "run_completed",
        "frontend_delivery_handoff",
    ]
    tenant_id: str
    workspace_id: str
    project_id: str
    run_id: str
    correlation_id: str
    causation_id: str | None = None
    sender_role: str = Field(min_length=2, max_length=100)
    recipient_role: str = Field(min_length=2, max_length=100)
    capability: str
    task_ref: str
    intent: str
    status: str
    payload: dict[str, Any]
    evidence_refs: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)
    risk_level: Literal["low", "medium", "high", "critical"]
    conflicts: list[str] = Field(default_factory=list)
    unresolved_questions: list[str] = Field(default_factory=list)
    requested_next_action: str
    created_at: str
    idempotency_key: str
    token_usage: dict[str, int] = Field(default_factory=dict)

    @field_validator("tenant_id", "workspace_id", "project_id", "run_id", "correlation_id", "idempotency_key")
    @classmethod
    def non_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value
