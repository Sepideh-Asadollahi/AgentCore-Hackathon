from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    host: str
    port: int
    shared_secret: str
    runtime_name: str
    log_level: str
    qwen_api_key: str
    qwen_base_url: str
    qwen_model: str
    qwen_timeout_seconds: float
    live_mode: bool
    use_llm: bool  # alias: live_mode for backward compatibility

    @classmethod
    def load(cls) -> Settings:
        secret = os.getenv("AGENTCORE_WEBHOOK_SHARED_SECRET", os.getenv("CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET", ""))
        if not secret:
            raise ValueError("AGENTCORE_WEBHOOK_SHARED_SECRET or CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET is required")
        live = os.getenv("WORKER_LIVE_MODE", os.getenv("WORKER_USE_LLM", "0")).lower() in {"1", "true", "yes"}
        api_key = os.getenv("QWEN_API_KEY", "")
        if live and not api_key:
            raise ValueError("QWEN_API_KEY is required when WORKER_LIVE_MODE=1")
        runtime = os.getenv("WORKER_RUNTIME_NAME", "langgraph-sdk-society-worker" if live else "langgraph-change-analyst")
        return cls(
            host=os.getenv("WORKER_HOST", "0.0.0.0"),
            port=int(os.getenv("WORKER_PORT", "32510")),
            shared_secret=secret,
            runtime_name=runtime,
            log_level=os.getenv("WORKER_LOG_LEVEL", "info"),
            qwen_api_key=api_key,
            qwen_base_url=os.getenv("QWEN_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"),
            qwen_model=os.getenv("QWEN_MODEL", "qwen-plus"),
            qwen_timeout_seconds=float(os.getenv("QWEN_TIMEOUT_SECONDS", "120")),
            live_mode=live,
            use_llm=live,
        )
