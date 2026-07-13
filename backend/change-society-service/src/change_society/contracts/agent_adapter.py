from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class AgentExecutionRequest:
    ticket_id: str
    agent_id: str
    role: str
    system_prompt: str
    user_prompt: str
    output_schema: type[Any]
    correlation_id: str


@dataclass(frozen=True)
class AgentExecutionResult:
    payload: dict[str, Any]
    input_tokens: int
    output_tokens: int
    duration_ms: int
    runtime: str
    external_execution_id: str | None = None
