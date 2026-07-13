from __future__ import annotations

import logging

from fastapi import FastAPI, Header, HTTPException, Request, Response

from agentcore_agent_sdk import SignedWebhookWorker, SignatureError

from .executor import WorkerExecutor, build_signed_webhook_worker
from .settings import Settings

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.load()
    executor = WorkerExecutor(settings)
    webhook = SignedWebhookWorker(settings.shared_secret, executor.execute)

    app = FastAPI(
        title="AgentCore External Change Analyst Worker",
        description="LangGraph worker implementing the signed AgentCore webhook execution contract.",
        version="1.0.0",
    )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ready")
    async def ready() -> dict[str, object]:
        return {
            "status": "ok",
            "runtime": settings.runtime_name,
            "live_mode": settings.live_mode,
            "use_llm": settings.use_llm,
        }

    @app.post("/api/v1/agent-tickets:execute")
    async def execute_ticket(
        request: Request,
        x_agentcore_signature: str = Header(alias="X-AgentCore-Signature"),
        x_correlation_id: str | None = Header(default=None, alias="X-Correlation-Id"),
    ) -> dict[str, object]:
        body = await request.body()
        try:
            result = webhook.handle(body, x_agentcore_signature)
        except SignatureError as exc:
            raise HTTPException(status_code=401, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        result["runtime"] = settings.runtime_name
        if executor.last_duration_ms:
            result["duration_ms"] = executor.last_duration_ms
        if x_correlation_id:
            logger.info("correlation_id=%s execution_id=%s", x_correlation_id, result.get("execution_id"))
        return result

    return app


def build_app(settings: Settings | None = None) -> FastAPI:
    """Alias for create_app (used by tests and uvicorn factory mode)."""
    return create_app(settings)
