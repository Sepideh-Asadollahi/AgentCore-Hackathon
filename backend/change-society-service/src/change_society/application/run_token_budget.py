from __future__ import annotations

from typing import Any

from ..domain.models import DependencyError
from .ports import ModelClient, ModelResult


class BudgetEnforcingModelClient:
    """Wraps a model port and enforces a per-society-run token ceiling."""

    def __init__(self, inner: ModelClient, run_token_budget: int):
        self._inner = inner
        self._run_token_budget = run_token_budget
        self._used_input = 0
        self._used_output = 0

    def complete(self, role: str, system_prompt: str, user_prompt: str, output_schema: type[Any]) -> ModelResult:
        projected = self._used_input + self._used_output
        if self._run_token_budget > 0 and projected >= self._run_token_budget:
            raise DependencyError(
                "qwen_budget_exceeded",
                "Society run token budget was exceeded before the next model call.",
                False,
            )
        result = self._inner.complete(role, system_prompt, user_prompt, output_schema)
        self._used_input += result.input_tokens
        self._used_output += result.output_tokens
        total = self._used_input + self._used_output
        if self._run_token_budget > 0 and total > self._run_token_budget:
            raise DependencyError(
                "qwen_budget_exceeded",
                "Society run token budget was exceeded after the model response.",
                False,
            )
        return result

    def health(self) -> dict[str, Any]:
        health = self._inner.health()
        return {
            **health,
            "run_token_budget": self._run_token_budget,
            "run_tokens_used": self._used_input + self._used_output,
        }

    def reset_budget(self) -> None:
        self._used_input = 0
        self._used_output = 0

    @property
    def tokens_used(self) -> int:
        return self._used_input + self._used_output
