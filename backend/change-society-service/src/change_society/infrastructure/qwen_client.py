from __future__ import annotations

import json
import time
from typing import Any

import httpx
from pydantic import ValidationError as PydanticValidationError

from ..application.ports import ModelResult
from ..application.qwen_role_tools import RoleToolExecutor, qwen_tool_definitions_for_role
from ..domain.models import DependencyError
from .qwen_output_normalizer import extract_json_object, validate_normalized_payload


class QwenCloudClient:
    def __init__(
        self,
        api_key: str,
        base_url: str,
        model: str,
        timeout_seconds: float,
        max_output_tokens: int,
        temperature: float,
        max_retries: int,
        client: httpx.Client | None = None,
        *,
        enable_tools: bool = True,
        tool_executor: RoleToolExecutor | None = None,
        max_tool_rounds: int = 2,
    ):
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout = timeout_seconds
        self._max_output_tokens = max_output_tokens
        self._temperature = temperature
        self._max_retries = max_retries
        self._client = client or httpx.Client(timeout=timeout_seconds)
        self._enable_tools = enable_tools
        self._tool_executor = tool_executor or RoleToolExecutor()
        self._max_tool_rounds = max(0, max_tool_rounds)

    def complete(self, role: str, system_prompt: str, user_prompt: str, output_schema: type[Any]) -> ModelResult:
        tools = qwen_tool_definitions_for_role(role) if self._enable_tools else []
        schema_hint = json.dumps(output_schema.model_json_schema(), separators=(",", ":"))
        schema_rules = (
            "Return one JSON object only. No markdown fences. "
            "Use keys exactly as in JSON SCHEMA. "
            "confidence must be 0.0-1.0. "
            "All list fields must be JSON arrays of strings."
        )
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": system_prompt + "\n" + schema_rules + "\nJSON SCHEMA:\n" + schema_hint},
            {"role": "user", "content": user_prompt},
        ]
        started = time.perf_counter()
        total_input = 0
        total_output = 0
        tool_rounds = 0

        for round_index in range(self._max_tool_rounds + 1):
            use_tools = bool(tools) and round_index < self._max_tool_rounds
            body: dict[str, Any] = {
                "model": self._model,
                "messages": messages,
                "temperature": self._temperature,
                "max_tokens": self._max_output_tokens,
            }
            if use_tools:
                body["tools"] = tools
                body["tool_choice"] = "auto"
            else:
                body["response_format"] = {"type": "json_object"}

            data, input_tokens, output_tokens = self._post_chat(role, body)
            total_input += input_tokens
            total_output += output_tokens
            message = data["choices"][0]["message"]
            tool_calls = message.get("tool_calls") or []
            if use_tools and tool_calls:
                tool_rounds += 1
                messages.append(message)
                for call in tool_calls:
                    function = call.get("function") or {}
                    name = function.get("name", "")
                    try:
                        arguments = json.loads(function.get("arguments") or "{}")
                    except json.JSONDecodeError:
                        arguments = {}
                    result = self._tool_executor.invoke(role, name, arguments, user_prompt)
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": call.get("id", name),
                            "content": json.dumps(result.output, separators=(",", ":")),
                        }
                    )
                continue

            content = message.get("content")
            if not content:
                if tool_calls:
                    raise DependencyError(
                        "qwen_tool_loop_exhausted",
                        "Qwen Cloud tool loop did not produce structured JSON.",
                        False,
                    )
                raise DependencyError("qwen_schema_invalid", "Qwen Cloud returned an empty message.", False)

            schema_attempts = 0
            while schema_attempts < 3:
                try:
                    parsed = extract_json_object(content)
                    validated = validate_normalized_payload(parsed, output_schema)
                    usage_model = data.get("model", self._model)
                    return ModelResult(
                        validated.model_dump(),
                        total_input,
                        total_output,
                        int((time.perf_counter() - started) * 1000),
                        usage_model,
                    )
                except json.JSONDecodeError:
                    repair = "Your previous answer was not valid JSON. Reply with a single JSON object only."
                except (PydanticValidationError, TypeError, ValueError):
                    repair = (
                        "Your JSON did not match the required schema. "
                        "Return corrected JSON with all required fields and no extra keys."
                    )
                schema_attempts += 1
                if schema_attempts >= 3:
                    raise DependencyError("qwen_schema_invalid", "Qwen Cloud JSON did not match the expected schema.", False)
                messages.append({"role": "assistant", "content": content})
                messages.append({"role": "user", "content": repair})
                repair_body = {
                    "model": self._model,
                    "messages": messages,
                    "temperature": self._temperature,
                    "max_tokens": self._max_output_tokens,
                    "response_format": {"type": "json_object"},
                }
                data, input_tokens, output_tokens = self._post_chat(role, repair_body)
                total_input += input_tokens
                total_output += output_tokens
                content = data["choices"][0]["message"].get("content") or ""
            continue

        raise DependencyError("qwen_tool_loop_exhausted", "Qwen Cloud tool loop did not produce structured JSON.", False)

    def _post_chat(self, role: str, body: dict[str, Any]) -> tuple[dict[str, Any], int, int]:
        for attempt in range(self._max_retries + 1):
            try:
                response = self._client.post(
                    f"{self._base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Content-Type": "application/json",
                        "X-AgentCore-Role": role,
                    },
                    json=body,
                )
                if response.status_code in {429, 500, 502, 503, 504} and attempt < self._max_retries:
                    time.sleep(min(0.25 * (2**attempt), 1.0))
                    continue
                if response.status_code == 401:
                    raise DependencyError("qwen_authentication_failed", "Qwen Cloud authentication failed.", False)
                if response.status_code in {402, 403}:
                    raise DependencyError("qwen_quota_exhausted", "Qwen Cloud quota or billing limit was reached.", False)
                if response.status_code == 429:
                    raise DependencyError("qwen_rate_limited", "Qwen Cloud rate limit was reached.", True)
                if response.status_code >= 400:
                    raise DependencyError("qwen_provider_error", f"Qwen Cloud returned HTTP {response.status_code}.", response.status_code >= 500)
                data = response.json()
                usage = data.get("usage", {})
                return data, int(usage.get("prompt_tokens", 0)), int(usage.get("completion_tokens", 0))
            except (httpx.TimeoutException, httpx.ConnectError) as exc:
                if attempt < self._max_retries:
                    time.sleep(min(0.25 * (2**attempt), 1.0))
                    continue
                raise DependencyError("qwen_timeout", "Qwen Cloud request timed out.", True) from exc
        raise DependencyError("qwen_provider_unavailable", "Qwen Cloud is unavailable.", True)

    def apply_connection(self, *, api_key: str | None = None, base_url: str | None = None, model: str | None = None) -> None:
        if api_key is not None and api_key.strip():
            self._api_key = api_key.strip()
        if base_url is not None and base_url.strip():
            self._base_url = base_url.strip().rstrip("/")
        if model is not None and model.strip():
            self._model = model.strip()

    def health(self) -> dict[str, Any]:
        configured = bool(self._api_key and self._model and self._base_url)
        return {
            "provider": "qwen_cloud",
            "configured": configured,
            "production_ready": configured,
            "model": self._model,
            "base_url": self._base_url,
            "role_tools_enabled": self._enable_tools,
            "max_tool_rounds": self._max_tool_rounds,
        }

    def close(self) -> None:
        self._client.close()
