from __future__ import annotations

from typing import TYPE_CHECKING

from ..application.run_token_budget import BudgetEnforcingModelClient

if TYPE_CHECKING:
    from ..application.ports import ModelClient

from .qwen_client import QwenCloudClient


def resolve_qwen_client(model: ModelClient) -> QwenCloudClient | None:
    inner = model._inner if isinstance(model, BudgetEnforcingModelClient) else model
    return inner if isinstance(inner, QwenCloudClient) else None
