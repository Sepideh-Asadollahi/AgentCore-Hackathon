from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

import httpx

from ..application.ports import AgentAdapter, ModelClient
from ..contracts.agent_adapter import AgentExecutionRequest, AgentExecutionResult
from ..domain.control_plane import ManagedAgent
from ..domain.models import DependencyError


class ModelAgentAdapter:
    """Adapter-managed demo worker. The model is outside the control-plane domain boundary."""

    def __init__(self, model: ModelClient):
        self._model = model

    def execute(self, agent: ManagedAgent, request: AgentExecutionRequest) -> AgentExecutionResult:
        result = self._model.complete(request.role, request.system_prompt, request.user_prompt, request.output_schema)
        return AgentExecutionResult(result.payload, result.input_tokens, result.output_tokens, result.duration_ms,
                                    result.model, f"model:{request.ticket_id}")

    def health(self, agent: ManagedAgent) -> dict[str, Any]:
        return self._model.health()


class WebhookAgentAdapter:
    """Generic external-agent HTTP adapter with signed, versioned requests."""

    def __init__(self, shared_secret: str, timeout_seconds: float, client: httpx.Client | None = None):
        self._secret = shared_secret.encode()
        self._client = client or httpx.Client(timeout=timeout_seconds)

    def execute(self, agent: ManagedAgent, request: AgentExecutionRequest) -> AgentExecutionResult:
        if not agent.endpoint or not self._secret:
            raise DependencyError("agent_adapter_not_configured", "Webhook agent adapter is not configured.", False)
        body = {
            "contract_version": "1.0", "ticket_id": request.ticket_id, "agent_id": request.agent_id,
            "role": request.role, "system_prompt": request.system_prompt, "user_prompt": request.user_prompt,
            "output_schema": request.output_schema.model_json_schema(), "correlation_id": request.correlation_id,
        }
        encoded = json.dumps(body, sort_keys=True, separators=(",", ":")).encode()
        signature = hmac.new(self._secret, encoded, hashlib.sha256).hexdigest()
        response = self._client.post(agent.endpoint.rstrip("/") + "/api/v1/agent-tickets:execute", content=encoded,
                                     headers={"Content-Type": "application/json", "X-AgentCore-Signature": signature,
                                              "X-Correlation-Id": request.correlation_id})
        if response.status_code >= 400:
            raise DependencyError("external_agent_failed", f"External agent returned HTTP {response.status_code}.", response.status_code >= 500)
        data = response.json()
        validated = request.output_schema.model_validate(data["output"])
        usage = data.get("usage", {})
        return AgentExecutionResult(validated.model_dump(), int(usage.get("input_tokens", 0)),
                                    int(usage.get("output_tokens", 0)), int(data.get("duration_ms", 0)),
                                    data.get("runtime", agent.provider), data.get("execution_id"))

    def health(self, agent: ManagedAgent) -> dict[str, Any]:
        if not agent.endpoint:
            return {"ready": False, "reason": "missing_endpoint"}
        try:
            response = self._client.get(agent.endpoint.rstrip("/") + "/ready")
            return {"ready": response.status_code == 200, "status_code": response.status_code}
        except httpx.HTTPError:
            return {"ready": False, "reason": "connection_failed"}


class StaticAgentAdapterRegistry:
    def __init__(self, adapters: dict[str, AgentAdapter]):
        self._adapters = adapters.copy()

    def get(self, adapter_type: str) -> AgentAdapter:
        try:
            return self._adapters[adapter_type]
        except KeyError as exc:
            raise DependencyError("agent_adapter_not_found", f"No adapter is registered for {adapter_type}.", False) from exc
