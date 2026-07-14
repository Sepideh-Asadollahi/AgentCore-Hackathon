from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class CreateSocietyRunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scenario_id: str = Field(min_length=3, max_length=100)
    request_text: str | None = Field(default=None, min_length=10, max_length=10_000)


class CreateSocietyRunResponse(BaseModel):
    society_run: dict[str, Any]
    correlation_id: str


class SocietyRunResponse(BaseModel):
    society_run: dict[str, Any]
    correlation_id: str


class SocietyRunListResponse(BaseModel):
    items: list[dict[str, Any]]
    page: dict[str, Any]
    correlation_id: str


class AgentMessageListResponse(BaseModel):
    items: list[dict[str, Any]]
    page: dict[str, Any]
    correlation_id: str


class ConflictListResponse(BaseModel):
    items: list[dict[str, Any]]
    page: dict[str, Any]
    correlation_id: str


class ManagedAgentListResponse(BaseModel):
    items: list[dict[str, Any]]
    page: dict[str, Any]
    correlation_id: str


class ManagedAgentResponse(BaseModel):
    agent: dict[str, Any]
    correlation_id: str


class AgentTicketListResponse(BaseModel):
    items: list[dict[str, Any]]
    page: dict[str, Any]
    correlation_id: str


class AgentTicketResponse(BaseModel):
    ticket: dict[str, Any]
    correlation_id: str


class AgentHeartbeatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    healthy: bool
    expected_version: int = Field(ge=1)


class AgentLifecycleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    target_state: Literal["online", "paused", "offline", "revoked"]
    expected_version: int = Field(ge=1)
    reason: str = Field(min_length=3, max_length=1000)


class ApprovalDecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: str = Field(min_length=3, max_length=2000)
    expected_version: int = Field(ge=1)


class DemoScenarioListResponse(BaseModel):
    items: list[dict[str, Any]]
    page: dict[str, Any]
    correlation_id: str


class BaselineEvaluationResponse(BaseModel):
    evaluation: dict[str, Any]
    correlation_id: str


class FrontendDeliveryResponse(BaseModel):
    delivery: dict[str, Any]
    correlation_id: str


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded", "not_ready"]
    service: str
    checks: dict[str, Any]


class ErrorBody(BaseModel):
    error_code: str
    category: str
    message: str
    retryable: bool
    correlation_id: str
    details: dict[str, Any]
    documentation_ref: str


class ErrorResponse(BaseModel):
    error: ErrorBody


class OrgPolicyIntakeAnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scenario_id: str = Field(min_length=3, max_length=100)
    process_narrative: str = Field(min_length=20, max_length=10_000)
    constraints: str = Field(default="", max_length=5000)


class OrgPolicyIntakeAnalyzeResponse(BaseModel):
    intake_session: dict[str, Any]
    correlation_id: str


class OrgPolicyIntakeSessionResponse(BaseModel):
    intake_session: dict[str, Any]
    correlation_id: str


class OrgPolicyChallengeResolveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    option_id: str = Field(min_length=3, max_length=100)


class OrgPolicyActivateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    adopted_candidate_ids: list[str] = Field(min_length=1, max_length=20)


class OrgPolicyActivateResponse(BaseModel):
    intake_session: dict[str, Any]
    activated_policies: list[dict[str, Any]]
    correlation_id: str


class OrgPolicyListResponse(BaseModel):
    items: list[dict[str, Any]]
    correlation_id: str


class HackathonLlmConnectionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    api_key: str = Field(default="", max_length=500)
    base_url: str = Field(default="", max_length=500)
    model: str = Field(default="", max_length=200)


class HackathonLlmConnectionResponse(BaseModel):
    applied: bool
    model_health: dict[str, Any]
    message: str
    correlation_id: str
