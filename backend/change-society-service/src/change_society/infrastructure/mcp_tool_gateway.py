from __future__ import annotations

import json
from typing import Any, Callable

import httpx

from ..domain.models import DependencyError


class McpToolGateway:
    """
    MCP-compatible tool dispatch boundary.

    Local handlers run in-process; optional remote URL accepts JSON-RPC shaped POST
    (tools/call) for external MCP servers without coupling domain code to MCP SDKs.
    """

    def __init__(
        self,
        local_handlers: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] | None = None,
        remote_url: str = "",
        timeout_seconds: float = 15.0,
        client: httpx.Client | None = None,
    ):
        self._local = local_handlers or {}
        self._remote_url = remote_url.rstrip("/")
        self._client = client or httpx.Client(timeout=timeout_seconds)

    def call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        if name in self._local:
            return self._local[name](arguments)
        if self._remote_url:
            return self._remote_call(name, arguments)
        raise DependencyError("mcp_tool_unavailable", f"No local or remote handler for tool {name}.", False)

    def _remote_call(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        payload = {
            "jsonrpc": "2.0",
            "id": "agentcore-mcp",
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        }
        response = self._client.post(self._remote_url, json=payload)
        if response.status_code >= 400:
            raise DependencyError("mcp_tool_remote_error", f"MCP gateway HTTP {response.status_code}.", response.status_code >= 500)
        data = response.json()
        if "error" in data:
            raise DependencyError("mcp_tool_remote_error", str(data["error"]), False)
        result = data.get("result", {})
        if isinstance(result, dict) and "structuredContent" in result:
            return dict(result["structuredContent"])
        return result if isinstance(result, dict) else {"result": result}

    def health(self) -> dict[str, Any]:
        return {
            "local_tools": sorted(self._local.keys()),
            "remote_configured": bool(self._remote_url),
            "remote_url": self._remote_url or None,
        }

    def close(self) -> None:
        self._client.close()
