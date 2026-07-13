from __future__ import annotations

import json
import logging
from typing import Any, Type

import httpx
from pydantic import BaseModel

from change_society.infrastructure.qwen_output_normalizer import extract_json_object, validate_normalized_payload

from .settings import Settings

logger = logging.getLogger(__name__)


def complete_structured(settings: Settings, system_prompt: str, user_prompt: str, schema_model: Type[BaseModel]) -> dict[str, Any]:
    schema_hint = json.dumps(schema_model.model_json_schema(), separators=(",", ":"))
    system = (
        system_prompt
        + "\nReturn one JSON object only. No markdown. Keys must match JSON SCHEMA exactly.\n"
        + "JSON SCHEMA:\n"
        + schema_hint
    )
    response = httpx.post(
        f"{settings.qwen_base_url.rstrip('/')}/chat/completions",
        headers={"Authorization": f"Bearer {settings.qwen_api_key}"},
        json={
            "model": settings.qwen_model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user_prompt}],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        },
        timeout=float(settings.qwen_timeout_seconds),
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    parsed = extract_json_object(content)
    return validate_normalized_payload(parsed, schema_model)
