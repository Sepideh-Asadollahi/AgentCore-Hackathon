from __future__ import annotations

import hmac
import logging
import os
import subprocess
import time
from uuid import uuid4

from fastapi import FastAPI, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ..infrastructure.model_client_resolve import resolve_qwen_client
from ..infrastructure.judge_runtime_config import apply_judge_runtime_config
from ..infrastructure.runtime_secrets_store import runtime_secret_status
from ..application.service import ChangeSocietyService
from ..application.judging_engineering_profile import build_judging_engineering_profile
from ..application.submission_compliance import build_submission_compliance_report
from ..domain.models import ConflictError, DependencyError, NotFoundError, Scope, SocietyError, ValidationError
from ..domain.control_plane import AgentState
from .schemas import (
    AgentHeartbeatRequest, AgentLifecycleRequest, AgentMessageListResponse, AgentTicketListResponse, AgentTicketResponse,
    ApprovalDecisionRequest, BaselineEvaluationResponse, ConflictListResponse, ManagedAgentListResponse, ManagedAgentResponse,
    CreateSocietyRunRequest, CreateSocietyRunResponse, DemoScenarioListResponse, ErrorResponse, FrontendDeliveryResponse, HealthResponse,
    OrgPolicyActivateRequest, OrgPolicyActivateResponse, OrgPolicyChallengeResolveRequest, OrgPolicyIntakeAnalyzeRequest,
    OrgPolicyIntakeAnalyzeResponse, OrgPolicyIntakeSessionResponse, OrgPolicyListResponse,
    HackathonLlmConnectionRequest, HackathonLlmConnectionResponse,
    HackathonJudgeRuntimeRequest, HackathonJudgeRuntimeResponse, HackathonJudgeRuntimeStatusResponse,
    SocietyRunListResponse, SocietyRunResponse,
)


STATUS_BY_CATEGORY = {
    "validation_error": 400, "authentication_error": 401, "authorization_error": 403,
    "not_found_error": 404, "conflict_error": 409, "policy_error": 422,
    "rate_limit_error": 429, "dependency_error": 503, "internal_error": 500,
}


def create_api(service: ChangeSocietyService, runtime_profile: dict[str, str] | None = None) -> FastAPI:
    http_log = logging.getLogger("change_society.http")
    app_log = logging.getLogger("change_society.api")
    allowed_origins = tuple(runtime_profile.get("allowed_origins", "").split(",")) if runtime_profile and runtime_profile.get("allowed_origins") else ()
    if runtime_profile and "allowed_origins_list" in runtime_profile:
        allowed_origins = tuple(runtime_profile["allowed_origins_list"])
    app = FastAPI(
        title="AgentCore Change Society API", version="1.0.0",
        description="Qwen-powered governed multi-agent software-change analysis.",
    )
    if allowed_origins:
        app.add_middleware(CORSMiddleware, allow_origins=list(allowed_origins), allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["*"])

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        cid = request.headers.get("X-Correlation-Id") or "-"
        started = time.perf_counter()
        try:
            response = await call_next(request)
            ms = (time.perf_counter() - started) * 1000
            http_log.info(
                "%s %s -> %s %.1fms cid=%s",
                request.method,
                request.url.path,
                response.status_code,
                ms,
                cid,
            )
            return response
        except Exception:
            ms = (time.perf_counter() - started) * 1000
            http_log.exception(
                "%s %s failed after %.1fms cid=%s",
                request.method,
                request.url.path,
                ms,
                cid,
            )
            raise

    def correlation(request: Request) -> str:
        return request.headers.get("X-Correlation-Id") or f"corr_{uuid4().hex}"

    @app.exception_handler(SocietyError)
    async def society_error_handler(request: Request, exc: SocietyError):
        correlation_id = correlation(request)
        app_log.warning(
            "society_error code=%s category=%s path=%s cid=%s msg=%s",
            exc.code,
            exc.category,
            request.url.path,
            correlation_id,
            exc.message,
        )
        return JSONResponse(
            status_code=STATUS_BY_CATEGORY.get(exc.category, 500),
            content={"error": {"error_code": exc.code, "category": exc.category, "message": exc.message, "retryable": exc.retryable,
                "correlation_id": correlation_id, "details": exc.details, "documentation_ref": f"hackathon/errors/{exc.code}"}},
        )

    @app.exception_handler(Exception)
    async def unexpected_error_handler(request: Request, exc: Exception):
        correlation_id = correlation(request)
        app_log.exception("unexpected_error path=%s cid=%s", request.url.path, correlation_id)
        return JSONResponse(status_code=500, content={"error": {"error_code": "internal_error", "category": "internal_error",
            "message": "An unexpected error occurred.", "retryable": False, "correlation_id": correlation_id, "details": {},
            "documentation_ref": "hackathon/errors/internal_error"}})

    def scope(project_id: str, tenant: str, workspace: str) -> Scope:
        return Scope(tenant, workspace, project_id)

    def page(items: list, page_size: int, page_token: str | None):
        try:
            offset = int(page_token or "0")
        except ValueError as exc:
            raise ValidationError("page_token is invalid") from exc
        if offset < 0:
            raise ValidationError("page_token is invalid")
        selected = items[offset: offset + page_size]
        next_offset = offset + len(selected)
        return selected, {"next_page_token": str(next_offset) if next_offset < len(items) else None, "page_size": page_size, "has_more": next_offset < len(items)}

    errors = {400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}, 503: {"model": ErrorResponse}}

    @app.get("/health", response_model=HealthResponse, operation_id="change_society_get_liveness", tags=["operations"])
    async def liveness():
        return {"status": "ok", "service": "change-society-service", "checks": {"process": True}}

    @app.get("/ready", response_model=HealthResponse, operation_id="change_society_get_readiness", tags=["operations"])
    async def readiness():
        store = service.repository.health()
        model = service.model.health()
        ready = bool(store.get("ready")) and bool(model.get("configured"))
        production_ready = (
            bool(store.get("production_ready"))
            and bool(model.get("production_ready") or model.get("provider") == "qwen_cloud")
            and model.get("provider") == "qwen_cloud"
        )
        return {"status": "ok" if ready and production_ready else ("degraded" if ready else "not_ready"), "service": "change-society-service", "checks": {"store": store, "model": model, "demo": {"demo_auto_approve": service.demo_auto_approve}}}

    @app.get("/api/v1/projects/{project_id}/demo-scenarios", response_model=DemoScenarioListResponse, operation_id="change_society_list_demo_scenarios", tags=["change-society"])
    async def list_scenarios(request: Request, project_id: str, x_tenant_id: str = Header(alias="X-Tenant-Id"), x_workspace_id: str = Header(alias="X-Workspace-Id"), page_size: int = Query(20, ge=1, le=50), page_token: str | None = None):
        scope(project_id, x_tenant_id, x_workspace_id)
        items, paging = page(service.list_scenarios(), page_size, page_token)
        return {"items": items, "page": paging, "correlation_id": correlation(request)}

    @app.post(
        "/api/v1/projects/{project_id}/org-policy-intake:analyze",
        response_model=OrgPolicyIntakeAnalyzeResponse,
        responses=errors,
        operation_id="change_society_analyze_org_policy_intake",
        tags=["org-policy-intake"],
    )
    async def analyze_org_policy_intake(
        request: Request,
        project_id: str,
        body: OrgPolicyIntakeAnalyzeRequest,
        x_tenant_id: str = Header(alias="X-Tenant-Id"),
        x_workspace_id: str = Header(alias="X-Workspace-Id"),
        x_actor_id: str = Header(alias="X-Actor-Id"),
    ):
        session = service.analyze_org_policy_intake(
            scope(project_id, x_tenant_id, x_workspace_id),
            x_actor_id,
            body.scenario_id,
            body.process_narrative,
            body.constraints,
        )
        return {"intake_session": session, "correlation_id": correlation(request)}

    @app.get(
        "/api/v1/projects/{project_id}/org-policy-intake/{session_id}",
        response_model=OrgPolicyIntakeSessionResponse,
        responses=errors,
        operation_id="change_society_get_org_policy_intake",
        tags=["org-policy-intake"],
    )
    async def get_org_policy_intake(
        request: Request,
        project_id: str,
        session_id: str,
        x_tenant_id: str = Header(alias="X-Tenant-Id"),
        x_workspace_id: str = Header(alias="X-Workspace-Id"),
    ):
        scope(project_id, x_tenant_id, x_workspace_id)
        return {"intake_session": service.get_org_policy_intake(session_id), "correlation_id": correlation(request)}

    @app.post(
        "/api/v1/projects/{project_id}/org-policy-intake/{session_id}/challenges/{challenge_id}:resolve",
        response_model=OrgPolicyIntakeSessionResponse,
        responses=errors,
        operation_id="change_society_resolve_org_policy_challenge",
        tags=["org-policy-intake"],
    )
    async def resolve_org_policy_challenge(
        request: Request,
        project_id: str,
        session_id: str,
        challenge_id: str,
        body: OrgPolicyChallengeResolveRequest,
        x_tenant_id: str = Header(alias="X-Tenant-Id"),
        x_workspace_id: str = Header(alias="X-Workspace-Id"),
    ):
        session = service.resolve_org_policy_challenge(
            scope(project_id, x_tenant_id, x_workspace_id),
            session_id,
            challenge_id,
            body.option_id,
        )
        return {"intake_session": session, "correlation_id": correlation(request)}

    @app.post(
        "/api/v1/projects/{project_id}/org-policy-intake/{session_id}:activate",
        response_model=OrgPolicyActivateResponse,
        responses=errors,
        operation_id="change_society_activate_org_policy_intake",
        tags=["org-policy-intake"],
    )
    async def activate_org_policy_intake(
        request: Request,
        project_id: str,
        session_id: str,
        body: OrgPolicyActivateRequest,
        x_tenant_id: str = Header(alias="X-Tenant-Id"),
        x_workspace_id: str = Header(alias="X-Workspace-Id"),
        x_actor_id: str = Header(alias="X-Actor-Id"),
    ):
        result = service.activate_org_policy_intake(
            scope(project_id, x_tenant_id, x_workspace_id),
            session_id,
            body.adopted_candidate_ids,
            x_actor_id,
        )
        return {
            "intake_session": result["intake_session"],
            "activated_policies": result["activated_policies"],
            "correlation_id": correlation(request),
        }

    @app.get(
        "/api/v1/projects/{project_id}/org-policies",
        response_model=OrgPolicyListResponse,
        operation_id="change_society_list_org_policies",
        tags=["org-policy-intake"],
    )
    async def list_org_policies(
        request: Request,
        project_id: str,
        x_tenant_id: str = Header(alias="X-Tenant-Id"),
        x_workspace_id: str = Header(alias="X-Workspace-Id"),
    ):
        items = service.list_org_policies(scope(project_id, x_tenant_id, x_workspace_id))
        return {"items": items, "correlation_id": correlation(request)}

    @app.get("/api/v1/projects/{project_id}/managed-agents", response_model=ManagedAgentListResponse, operation_id="agent_control_list_managed_agents", tags=["agent-control"])
    async def list_managed_agents(request: Request, project_id: str, x_tenant_id: str = Header(alias="X-Tenant-Id"), x_workspace_id: str = Header(alias="X-Workspace-Id"), page_size: int = Query(50, ge=1, le=100), page_token: str | None = None):
        items = [agent.public() for agent in service.control_plane.list_agents(scope(project_id, x_tenant_id, x_workspace_id))]
        selected, paging = page(items, page_size, page_token)
        return {"items": selected, "page": paging, "correlation_id": correlation(request)}

    @app.post("/api/v1/projects/{project_id}/managed-agents/{agent_id}:heartbeat", response_model=ManagedAgentResponse, responses=errors, operation_id="agent_control_record_agent_heartbeat", tags=["agent-control"])
    async def heartbeat_agent(request: Request, project_id: str, agent_id: str, body: AgentHeartbeatRequest, x_tenant_id: str = Header(alias="X-Tenant-Id"), x_workspace_id: str = Header(alias="X-Workspace-Id")):
        agent = service.control_plane.heartbeat(scope(project_id, x_tenant_id, x_workspace_id), agent_id, body.healthy, body.expected_version)
        return {"agent": agent.public(), "correlation_id": correlation(request)}

    @app.post("/api/v1/projects/{project_id}/managed-agents/{agent_id}:set-state", response_model=ManagedAgentResponse, responses=errors, operation_id="agent_control_set_managed_agent_state", tags=["agent-control"])
    async def set_agent_state(request: Request, project_id: str, agent_id: str, body: AgentLifecycleRequest, x_tenant_id: str = Header(alias="X-Tenant-Id"), x_workspace_id: str = Header(alias="X-Workspace-Id"), x_actor_id: str = Header(alias="X-Actor-Id")):
        agent = service.control_plane.set_agent_state(scope(project_id, x_tenant_id, x_workspace_id), agent_id, AgentState(body.target_state), body.expected_version)
        return {"agent": agent.public(), "correlation_id": correlation(request)}

    @app.post("/api/v1/projects/{project_id}/society-runs", response_model=CreateSocietyRunResponse, responses=errors, operation_id="change_society_create_society_run", tags=["change-society"])
    async def create_run(request: Request, project_id: str, body: CreateSocietyRunRequest, x_tenant_id: str = Header(alias="X-Tenant-Id"), x_workspace_id: str = Header(alias="X-Workspace-Id"), x_actor_id: str = Header(alias="X-Actor-Id"), idempotency_key: str = Header(alias="Idempotency-Key")):
        corr = correlation(request)
        app_log.info(
            "create_society_run request project=%s scenario=%s actor=%s idempotency=%s correlation=%s request_len=%s",
            project_id,
            body.scenario_id,
            x_actor_id,
            idempotency_key[:16] if idempotency_key else "",
            corr,
            len(body.request_text or ""),
        )
        try:
            run = service.create_run(scope(project_id, x_tenant_id, x_workspace_id), x_actor_id, corr, idempotency_key, body.scenario_id, body.request_text)
        except SocietyError as exc:
            app_log.warning(
                "create_society_run failed project=%s scenario=%s correlation=%s category=%s message=%s",
                project_id,
                body.scenario_id,
                corr,
                exc.category,
                exc.message,
            )
            raise
        app_log.info(
            "create_society_run ok project=%s run_id=%s state=%s correlation=%s",
            project_id,
            run.run_id,
            run.state.value if hasattr(run.state, "value") else run.state,
            corr,
        )
        return {"society_run": run.public(), "correlation_id": corr}

    @app.get(
        "/api/v1/projects/{project_id}/demo-scenarios/{scenario_id}/latest-society-run",
        response_model=SocietyRunResponse,
        responses=errors,
        operation_id="change_society_get_latest_society_run_for_scenario",
        tags=["change-society"],
    )
    async def latest_run_for_scenario(
        request: Request,
        project_id: str,
        scenario_id: str,
        x_tenant_id: str = Header(alias="X-Tenant-Id"),
        x_workspace_id: str = Header(alias="X-Workspace-Id"),
    ):
        run = service.latest_run_for_scenario(scope(project_id, x_tenant_id, x_workspace_id), scenario_id)
        if run is None:
            raise NotFoundError()
        return {"society_run": run.public(), "correlation_id": correlation(request)}

    @app.get("/api/v1/projects/{project_id}/society-runs", response_model=SocietyRunListResponse, operation_id="change_society_list_society_runs", tags=["change-society"])
    async def list_runs(request: Request, project_id: str, x_tenant_id: str = Header(alias="X-Tenant-Id"), x_workspace_id: str = Header(alias="X-Workspace-Id"), page_size: int = Query(20, ge=1, le=100), page_token: str | None = None):
        runs = [item.public() for item in service.repository.list_runs(scope(project_id, x_tenant_id, x_workspace_id))]
        items, paging = page(runs, page_size, page_token)
        return {"items": items, "page": paging, "correlation_id": correlation(request)}

    @app.get("/api/v1/projects/{project_id}/society-runs/{run_id}", response_model=SocietyRunResponse, responses=errors, operation_id="change_society_get_society_run", tags=["change-society"])
    async def get_run(request: Request, project_id: str, run_id: str, x_tenant_id: str = Header(alias="X-Tenant-Id"), x_workspace_id: str = Header(alias="X-Workspace-Id")):
        run = service.repository.get(scope(project_id, x_tenant_id, x_workspace_id), run_id)
        return {"society_run": run.public(), "correlation_id": correlation(request)}

    @app.get("/api/v1/projects/{project_id}/society-runs/{run_id}/agent-messages", response_model=AgentMessageListResponse, responses=errors, operation_id="change_society_list_agent_messages", tags=["change-society"])
    async def list_messages(request: Request, project_id: str, run_id: str, x_tenant_id: str = Header(alias="X-Tenant-Id"), x_workspace_id: str = Header(alias="X-Workspace-Id"), page_size: int = Query(50, ge=1, le=100), page_token: str | None = None):
        run = service.repository.get(scope(project_id, x_tenant_id, x_workspace_id), run_id)
        items, paging = page([item.public() for item in run.messages], page_size, page_token)
        return {"items": items, "page": paging, "correlation_id": correlation(request)}

    @app.get("/api/v1/projects/{project_id}/society-runs/{run_id}/conflicts", response_model=ConflictListResponse, responses=errors, operation_id="change_society_list_conflicts", tags=["change-society"])
    async def list_conflicts(request: Request, project_id: str, run_id: str, x_tenant_id: str = Header(alias="X-Tenant-Id"), x_workspace_id: str = Header(alias="X-Workspace-Id"), page_size: int = Query(20, ge=1, le=100), page_token: str | None = None):
        run = service.repository.get(scope(project_id, x_tenant_id, x_workspace_id), run_id)
        items, paging = page([item.public() for item in run.conflicts], page_size, page_token)
        return {"items": items, "page": paging, "correlation_id": correlation(request)}

    @app.get(
        "/api/v1/projects/{project_id}/society-runs/{run_id}/frontend-delivery",
        response_model=FrontendDeliveryResponse,
        responses=errors,
        operation_id="change_society_get_frontend_delivery",
        tags=["change-society"],
    )
    async def frontend_delivery(
        request: Request,
        project_id: str,
        run_id: str,
        x_tenant_id: str = Header(alias="X-Tenant-Id"),
        x_workspace_id: str = Header(alias="X-Workspace-Id"),
    ):
        delivery = service.get_frontend_delivery(scope(project_id, x_tenant_id, x_workspace_id), run_id)
        return {"delivery": delivery, "correlation_id": correlation(request)}

    @app.get("/api/v1/projects/{project_id}/agent-tickets", response_model=AgentTicketListResponse, operation_id="agent_control_list_agent_tickets", tags=["agent-control"])
    async def list_agent_tickets(request: Request, project_id: str, x_tenant_id: str = Header(alias="X-Tenant-Id"), x_workspace_id: str = Header(alias="X-Workspace-Id"), run_id: str | None = None, page_size: int = Query(50, ge=1, le=100), page_token: str | None = None):
        items = [ticket.public() for ticket in service.control_plane.list_tickets(scope(project_id, x_tenant_id, x_workspace_id), run_id)]
        selected, paging = page(items, page_size, page_token)
        return {"items": selected, "page": paging, "correlation_id": correlation(request)}

    @app.get("/api/v1/projects/{project_id}/agent-tickets/{ticket_id}", response_model=AgentTicketResponse, responses=errors, operation_id="agent_control_get_agent_ticket", tags=["agent-control"])
    async def get_agent_ticket(request: Request, project_id: str, ticket_id: str, x_tenant_id: str = Header(alias="X-Tenant-Id"), x_workspace_id: str = Header(alias="X-Workspace-Id")):
        ticket = service.control_plane.get_ticket(scope(project_id, x_tenant_id, x_workspace_id), ticket_id)
        return {"ticket": ticket.public(), "correlation_id": correlation(request)}

    def decision(request: Request, project_id: str, run_id: str, body: ApprovalDecisionRequest, action: str, tenant: str, workspace: str, actor: str, key: str):
        run = service.decide(scope(project_id, tenant, workspace), run_id, actor, correlation(request), key, action, body.reason, body.expected_version)
        return {"society_run": run.public(), "correlation_id": correlation(request)}

    @app.post("/api/v1/projects/{project_id}/society-runs/{run_id}:approve", response_model=SocietyRunResponse, responses=errors, operation_id="change_society_approve_society_run", tags=["change-society"])
    async def approve(request: Request, project_id: str, run_id: str, body: ApprovalDecisionRequest, x_tenant_id: str = Header(alias="X-Tenant-Id"), x_workspace_id: str = Header(alias="X-Workspace-Id"), x_actor_id: str = Header(alias="X-Actor-Id"), idempotency_key: str = Header(alias="Idempotency-Key")):
        return decision(request, project_id, run_id, body, "approve", x_tenant_id, x_workspace_id, x_actor_id, idempotency_key)

    @app.post("/api/v1/projects/{project_id}/society-runs/{run_id}:reject", response_model=SocietyRunResponse, responses=errors, operation_id="change_society_reject_society_run", tags=["change-society"])
    async def reject(request: Request, project_id: str, run_id: str, body: ApprovalDecisionRequest, x_tenant_id: str = Header(alias="X-Tenant-Id"), x_workspace_id: str = Header(alias="X-Workspace-Id"), x_actor_id: str = Header(alias="X-Actor-Id"), idempotency_key: str = Header(alias="Idempotency-Key")):
        return decision(request, project_id, run_id, body, "reject", x_tenant_id, x_workspace_id, x_actor_id, idempotency_key)

    @app.post("/api/v1/projects/{project_id}/society-runs/{run_id}:request-changes", response_model=SocietyRunResponse, responses=errors, operation_id="change_society_request_changes_society_run", tags=["change-society"])
    async def request_changes(request: Request, project_id: str, run_id: str, body: ApprovalDecisionRequest, x_tenant_id: str = Header(alias="X-Tenant-Id"), x_workspace_id: str = Header(alias="X-Workspace-Id"), x_actor_id: str = Header(alias="X-Actor-Id"), idempotency_key: str = Header(alias="Idempotency-Key")):
        return decision(request, project_id, run_id, body, "request_changes", x_tenant_id, x_workspace_id, x_actor_id, idempotency_key)

    @app.get("/api/v1/hackathon/submission-compliance", operation_id="change_society_get_submission_compliance", tags=["operations"])
    async def submission_compliance(request: Request):
        report = build_submission_compliance_report(
            model=service.model,
            repository=service.repository,
            model_provider=(runtime_profile or {}).get("model_provider", "unknown"),
            store=(runtime_profile or {}).get("store", "unknown"),
            environment=(runtime_profile or {}).get("environment", "unknown"),
            alibaba_proof_module="hackathon/backend/change-society-service/src/change_society/infrastructure/alibaba_ecs.py",
            architecture_doc="hackathon/docs/02-architecture.md",
            evaluation_artifact="hackathon/evidence/real/evaluation-scenarios.json",
        )
        return {"report": report, "correlation_id": correlation(request)}

    @app.get("/api/v1/hackathon/judging-engineering-profile", operation_id="change_society_get_judging_engineering_profile", tags=["operations"])
    async def judging_engineering_profile(request: Request):
        profile = build_judging_engineering_profile(model_health=service.model.health())
        return {"profile": profile, "correlation_id": correlation(request)}

    @app.post(
        "/api/v1/hackathon/dev/llm-connection",
        response_model=HackathonLlmConnectionResponse,
        responses=errors,
        operation_id="change_society_apply_dev_llm_connection",
        tags=["operations"],
    )
    async def apply_dev_llm_connection(request: Request, body: HackathonLlmConnectionRequest):
        environment = (runtime_profile or {}).get("environment", "production")
        if environment != "development":
            raise ValidationError("dev_llm_connection requires CHANGE_SOCIETY_ENVIRONMENT=development")
        client = resolve_qwen_client(service.model)
        if client is None:
            raise ValidationError(
                "API is not using the Qwen model client. Set CHANGE_SOCIETY_MODEL_PROVIDER=qwen in hackathon/.env and restart the API process."
            )
        if not body.api_key.strip() and not client.health().get("configured"):
            raise ValidationError("api_key is required when the Qwen client is not already configured")
        client.apply_connection(
            api_key=body.api_key or None,
            base_url=body.base_url or None,
            model=body.model or None,
        )
        health = client.health()
        return {
            "applied": True,
            "model_health": health,
            "message": "Qwen connection updated for this API process (development only).",
            "correlation_id": correlation(request),
        }

    @app.post(
        "/api/v1/hackathon/dev/judge-runtime-apply",
        response_model=HackathonJudgeRuntimeResponse,
        responses=errors,
        operation_id="change_society_apply_judge_runtime",
        tags=["operations"],
    )
    async def apply_judge_runtime(
        request: Request,
        body: HackathonJudgeRuntimeRequest,
        x_judge_runtime_secret: str | None = Header(default=None, alias="X-Judge-Runtime-Secret"),
    ):
        environment = (runtime_profile or {}).get("environment", "production")
        if environment != "development":
            raise ValidationError("judge_runtime_apply requires CHANGE_SOCIETY_ENVIRONMENT=development")
        expected = os.getenv("CHANGE_SOCIETY_JUDGE_RUNTIME_SECRET", "").strip()
        if expected:
            provided = (x_judge_runtime_secret or "").strip()
            if not provided or not hmac.compare_digest(expected, provided):
                raise ValidationError("Invalid or missing X-Judge-Runtime-Secret header")
        try:
            result = apply_judge_runtime_config(
                qwen_api_key=body.qwen_api_key,
                qwen_base_url=body.qwen_base_url or None,
                qwen_model=body.qwen_model or None,
                restart_worker=body.restart_worker,
                restart_api=body.restart_api,
            )
        except (ValueError, subprocess.CalledProcessError, OSError) as exc:
            app_log.warning("judge runtime apply failed: %s", exc.__class__.__name__)
            raise ValidationError(f"Could not apply judge runtime config: {exc}") from exc
        worker = result.get("worker_ready") or {}
        live = worker.get("live_mode")
        ok = worker.get("status") == "ok" if body.restart_worker else True
        msg = (
            "Qwen key saved on the server (PostgreSQL + .env for the worker) and LangGraph worker restarted."
            if ok
            else "Key saved on the server; worker restart requested but /ready is not OK yet — wait a few seconds and test a run."
        )
        return {
            "applied": True,
            "message": msg,
            "keys_updated": result.get("keys_updated", []),
            "restarted_units": result.get("restarted_units", []),
            "worker_ready": worker,
            "stored_in_database": True,
            "correlation_id": correlation(request),
        }

    @app.get(
        "/api/v1/hackathon/dev/judge-runtime-status",
        response_model=HackathonJudgeRuntimeStatusResponse,
        operation_id="change_society_get_judge_runtime_status",
        tags=["operations"],
    )
    async def get_judge_runtime_status(request: Request):
        environment = (runtime_profile or {}).get("environment", "production")
        if environment != "development":
            raise ValidationError("judge_runtime_status requires CHANGE_SOCIETY_ENVIRONMENT=development")
        status = runtime_secret_status()
        return {
            **status,
            "model_provider": (runtime_profile or {}).get("model_provider", "unknown"),
            "correlation_id": correlation(request),
        }

    @app.post("/api/v1/projects/{project_id}/society-runs:evaluate-all-scenarios", operation_id="change_society_evaluate_all_scenarios", tags=["evaluation"])
    async def evaluate_all_scenarios(
        request: Request,
        project_id: str,
        x_tenant_id: str = Header(alias="X-Tenant-Id"),
        x_workspace_id: str = Header(alias="X-Workspace-Id"),
        x_actor_id: str = Header(alias="X-Actor-Id"),
    ):
        result = service.evaluate_all_scenarios(
            scope(project_id, x_tenant_id, x_workspace_id),
            x_actor_id,
            correlation(request),
        )
        return {"evaluation": result, "correlation_id": correlation(request)}

    @app.post("/api/v1/projects/{project_id}/society-runs/{run_id}:evaluate-baseline", response_model=BaselineEvaluationResponse, responses=errors, operation_id="change_society_evaluate_single_agent_baseline", tags=["evaluation"])
    async def evaluate(request: Request, project_id: str, run_id: str, x_tenant_id: str = Header(alias="X-Tenant-Id"), x_workspace_id: str = Header(alias="X-Workspace-Id")):
        result = service.evaluate_baseline(scope(project_id, x_tenant_id, x_workspace_id), run_id)
        return {"evaluation": result, "correlation_id": correlation(request)}

    return app
