from __future__ import annotations

import logging
import time
from typing import Any

from agentcore_agent_sdk import AgentCoreExecutionTask, SignedWebhookWorker

from .graph.society_role_graph import RoleGraphRegistry
from .settings import Settings

logger = logging.getLogger(__name__)


class WorkerExecutor:
    """AgentCore SDK webhook executor — each role runs a LangGraph pipeline (live Qwen when enabled)."""

    def __init__(self, settings: Settings):
        self._settings = settings
        self.last_duration_ms = 0
        self._graphs = RoleGraphRegistry(settings)

    def execute(self, task: AgentCoreExecutionTask) -> dict[str, Any]:
        started = time.perf_counter()
        payload = self._graphs.invoke(task)
        self.last_duration_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "langgraph_sdk ticket=%s role=%s duration_ms=%s live=%s",
            task.ticket_id,
            task.role,
            self.last_duration_ms,
            self._settings.live_mode,
        )
        return payload


def build_signed_webhook_worker(settings: Settings) -> SignedWebhookWorker:
    executor = WorkerExecutor(settings)
    worker = SignedWebhookWorker(settings.shared_secret, executor.execute)
    return worker
