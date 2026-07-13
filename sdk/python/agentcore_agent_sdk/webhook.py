from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass
from typing import Any, Callable, Mapping


class SignatureError(ValueError):
    pass


@dataclass(frozen=True)
class AgentCoreExecutionTask:
    contract_version: str
    ticket_id: str
    agent_id: str
    role: str
    system_prompt: str
    user_prompt: str
    output_schema: Mapping[str, Any]
    correlation_id: str

    @classmethod
    def parse(cls, value: Mapping[str, Any]) -> "AgentCoreExecutionTask":
        task = cls(**{name: value[name] for name in cls.__dataclass_fields__})
        if task.contract_version != "1.0" or not task.ticket_id or not task.agent_id:
            raise ValueError("unsupported or incomplete AgentCore execution contract")
        return task


class SignedWebhookWorker:
    """Framework-neutral handler used inside FastAPI, Flask, or another agent runtime."""

    def __init__(self, shared_secret: str, executor: Callable[[AgentCoreExecutionTask], Mapping[str, Any]]):
        if not shared_secret:
            raise ValueError("shared_secret is required")
        self._secret = shared_secret.encode()
        self._executor = executor

    def handle(self, raw_body: bytes, signature: str) -> dict[str, Any]:
        expected = hmac.new(self._secret, raw_body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise SignatureError("AgentCore webhook signature is invalid")
        task = AgentCoreExecutionTask.parse(json.loads(raw_body))
        output = dict(self._executor(task))
        return {"contract_version": "1.0", "execution_id": f"external:{task.ticket_id}", "output": output,
                "usage": {"input_tokens": 0, "output_tokens": 0}, "duration_ms": 0, "runtime": "external"}
