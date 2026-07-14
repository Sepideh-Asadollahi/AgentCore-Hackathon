from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI

from ..application.qwen_role_tools import RoleToolExecutor
from ..application.run_token_budget import BudgetEnforcingModelClient
from ..application.control_plane import AgentControlPlane, AgentTemplate, CapabilityRouter
from ..application.service import ChangeSocietyService
from ..infrastructure.agent_adapters import ModelAgentAdapter, StaticAgentAdapterRegistry, WebhookAgentAdapter
from ..infrastructure.control_plane_repositories import InMemoryControlPlaneRepository, PostgresControlPlaneRepository
from ..infrastructure.evidence_catalog import ScenarioEvidenceProvider
from ..infrastructure.fake_model import DeterministicModelClient
from ..infrastructure.mcp_tool_gateway import McpToolGateway
from ..infrastructure.qwen_client import QwenCloudClient
from ..infrastructure.repositories import InMemoryRunRepository, PostgresRunRepository
from ..infrastructure.runtime import SystemClock, UuidGenerator
from ..infrastructure.logging_config import setup_logging
from ..interfaces.api import create_api
from .config import Settings


def build_service(settings: Settings | None = None) -> ChangeSocietyService:
    settings = settings or Settings.load()
    repository = PostgresRunRepository(settings.database_url) if settings.store == "postgresql" else InMemoryRunRepository()
    if settings.model_provider == "qwen":
        mcp_gateway = McpToolGateway(remote_url=settings.mcp_tool_gateway_url)
        tool_executor = RoleToolExecutor(mcp_gateway=mcp_gateway.call_tool if settings.mcp_tool_gateway_url else None)
        inner_model = QwenCloudClient(
            settings.qwen_api_key,
            settings.qwen_base_url,
            settings.qwen_model,
            settings.qwen_timeout_seconds,
            settings.qwen_max_output_tokens,
            settings.qwen_temperature,
            settings.qwen_max_retries,
            enable_tools=settings.enable_qwen_role_tools,
            tool_executor=tool_executor,
            max_tool_rounds=settings.qwen_max_tool_rounds,
        )
    else:
        inner_model = DeterministicModelClient()
    model = (
        BudgetEnforcingModelClient(inner_model, settings.qwen_run_token_budget)
        if settings.qwen_run_token_budget > 0 else inner_model
    )
    config_path = Path(settings.managed_agents_config) if settings.managed_agents_config else Path(__file__).parents[3] / "config" / "managed-agents.json"
    raw_templates = json.loads(config_path.read_text(encoding="utf-8"))
    templates = tuple(AgentTemplate(
        item["key"], item["name"], item["provider"], item["adapter_type"], tuple(item["capabilities"]),
        item["role"], item.get("description", ""), item.get("endpoint"),
    ) for item in raw_templates["agents"])
    control_repository = PostgresControlPlaneRepository(settings.database_url) if settings.store == "postgresql" else InMemoryControlPlaneRepository()
    adapters = StaticAgentAdapterRegistry({
        "model": ModelAgentAdapter(model),
        "webhook": WebhookAgentAdapter(settings.webhook_agent_secret, settings.webhook_agent_timeout_seconds),
    })
    clock = SystemClock()
    ids = UuidGenerator()
    control_plane = AgentControlPlane(control_repository, adapters, CapabilityRouter(), clock, ids, templates)
    return ChangeSocietyService(
        repository, model, ScenarioEvidenceProvider(), clock, ids, control_plane, settings.context_token_budget,
        demo_auto_approve=settings.demo_auto_approve,
    )


def build_app(settings: Settings | None = None, service: ChangeSocietyService | None = None) -> FastAPI:
    setup_logging()
    settings = settings or Settings.load()
    service = service or build_service(settings)
    profile = {
        "environment": settings.environment,
        "model_provider": settings.model_provider,
        "store": settings.store,
        "allowed_origins_list": list(settings.allowed_origins),
        "demo_auto_approve": settings.demo_auto_approve,
    }
    return create_api(service, profile)
