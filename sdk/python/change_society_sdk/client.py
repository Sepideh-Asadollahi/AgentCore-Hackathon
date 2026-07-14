from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import uuid4

import httpx


class ChangeSocietySdkError(Exception):
    def __init__(self, code: str, message: str, retryable: bool = False):
        super().__init__(message); self.code = code; self.retryable = retryable


@dataclass(frozen=True)
class Scope:
    tenant_id: str
    workspace_id: str
    project_id: str
    actor_id: str


class ChangeSocietyClient:
    def __init__(self, base_url: str, scope: Scope, timeout: float = 45, transport: httpx.BaseTransport | None = None):
        self.scope = scope
        self._client = httpx.Client(base_url=base_url.rstrip("/"), timeout=timeout, transport=transport)

    def _request(self, method: str, path: str, *, json: dict[str, Any] | None = None, idempotency_key: str | None = None) -> dict[str, Any]:
        headers = {"X-Tenant-Id": self.scope.tenant_id, "X-Workspace-Id": self.scope.workspace_id,
            "X-Actor-Id": self.scope.actor_id, "X-Correlation-Id": f"corr_{uuid4().hex}"}
        if idempotency_key: headers["Idempotency-Key"] = idempotency_key
        response = self._client.request(method, path, headers=headers, json=json)
        try:
            data = response.json()
        except ValueError as exc:
            raise ChangeSocietySdkError(
                "invalid_response",
                f"API returned non-JSON HTTP {response.status_code} for {path}.",
                response.status_code >= 500,
            ) from exc
        if response.is_error:
            error = data.get("error", {})
            raise ChangeSocietySdkError(error.get("error_code", "http_error"), error.get("message", "Request failed."), error.get("retryable", False))
        return data

    @property
    def prefix(self) -> str: return f"/api/v1/projects/{self.scope.project_id}"
    def list_scenarios(self): return self._request("GET", f"{self.prefix}/demo-scenarios")["items"]
    def list_managed_agents(self): return self._request("GET", f"{self.prefix}/managed-agents?page_size=100")["items"]
    def list_agent_tickets(self, run_id: str | None = None):
        query = f"?page_size=100&run_id={run_id}" if run_id else "?page_size=100"
        return self._request("GET", f"{self.prefix}/agent-tickets{query}")["items"]
    def get_agent_ticket(self, ticket_id: str): return self._request("GET", f"{self.prefix}/agent-tickets/{ticket_id}")["ticket"]
    def heartbeat_agent(self, agent_id: str, healthy: bool, expected_version: int):
        return self._request("POST", f"{self.prefix}/managed-agents/{agent_id}:heartbeat", json={"healthy": healthy, "expected_version": expected_version})["agent"]
    def set_agent_state(self, agent_id: str, target_state: str, reason: str, expected_version: int):
        return self._request("POST", f"{self.prefix}/managed-agents/{agent_id}:set-state", json={"target_state": target_state, "reason": reason, "expected_version": expected_version})["agent"]
    def create_run(self, scenario_id: str, request_text: str | None = None, idempotency_key: str | None = None):
        body = {"scenario_id": scenario_id, **({"request_text": request_text} if request_text else {})}
        return self._request("POST", f"{self.prefix}/society-runs", json=body, idempotency_key=idempotency_key or str(uuid4()))["society_run"]
    def get_run(self, run_id: str): return self._request("GET", f"{self.prefix}/society-runs/{run_id}")["society_run"]
    def list_messages(self, run_id: str): return self._request("GET", f"{self.prefix}/society-runs/{run_id}/agent-messages?page_size=100")["items"]
    def decide(self, run_id: str, action: str, reason: str, expected_version: int, idempotency_key: str | None = None):
        command = "request-changes" if action == "request_changes" else action
        return self._request("POST", f"{self.prefix}/society-runs/{run_id}:{command}", json={"reason": reason, "expected_version": expected_version}, idempotency_key=idempotency_key or str(uuid4()))["society_run"]
    def evaluate_baseline(self, run_id: str): return self._request("POST", f"{self.prefix}/society-runs/{run_id}:evaluate-baseline")["evaluation"]
    def close(self): self._client.close()
