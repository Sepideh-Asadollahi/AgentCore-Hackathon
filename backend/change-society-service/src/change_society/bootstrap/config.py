from __future__ import annotations

from dataclasses import dataclass
import os


def _int(name: str, default: int, minimum: int = 0) -> int:
    value = int(os.getenv(name, str(default)))
    if value < minimum:
        raise ValueError(f"{name} must be at least {minimum}")
    return value


def _float(name: str, default: float, minimum: float = 0) -> float:
    value = float(os.getenv(name, str(default)))
    if value < minimum:
        raise ValueError(f"{name} must be at least {minimum}")
    return value


@dataclass(frozen=True)
class Settings:
    environment: str
    model_provider: str
    qwen_api_key: str
    qwen_base_url: str
    qwen_model: str
    qwen_timeout_seconds: float
    qwen_max_output_tokens: int
    qwen_temperature: float
    qwen_max_retries: int
    store: str
    database_url: str
    context_token_budget: int
    qwen_run_token_budget: int
    enable_live_qwen_tests: bool
    enable_qwen_role_tools: bool
    qwen_max_tool_rounds: int
    mcp_tool_gateway_url: str
    allowed_origins: tuple[str, ...]
    managed_agents_config: str
    webhook_agent_secret: str
    webhook_agent_timeout_seconds: float
    demo_auto_approve: bool

    @classmethod
    def load(cls) -> "Settings":
        env = os.getenv("CHANGE_SOCIETY_ENVIRONMENT", "development")
        demo_default = env != "production"
        demo_auto_approve = os.getenv("CHANGE_SOCIETY_DEMO_AUTO_APPROVE", "1" if demo_default else "0").lower() in {
            "1",
            "true",
            "yes",
        }
        value = cls(
            environment=env,
            model_provider=os.getenv("CHANGE_SOCIETY_MODEL_PROVIDER", "fake"),
            qwen_api_key=os.getenv("QWEN_API_KEY", ""),
            qwen_base_url=os.getenv("QWEN_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"),
            qwen_model=os.getenv("QWEN_MODEL", "qwen-plus"),
            qwen_timeout_seconds=_float("QWEN_TIMEOUT_SECONDS", 30, 1),
            qwen_max_output_tokens=_int("QWEN_MAX_OUTPUT_TOKENS", 1400, 100),
            qwen_temperature=_float("QWEN_TEMPERATURE", 0.1, 0),
            qwen_max_retries=_int("QWEN_MAX_RETRIES", 1, 0),
            store=os.getenv("CHANGE_SOCIETY_STORE", "memory"),
            database_url=os.getenv("CHANGE_SOCIETY_DATABASE_URL", ""),
            context_token_budget=_int("CHANGE_SOCIETY_CONTEXT_TOKEN_BUDGET", 1800, 200),
            qwen_run_token_budget=_int("CHANGE_SOCIETY_QWEN_RUN_TOKEN_BUDGET", 40000, 0),
            enable_live_qwen_tests=os.getenv("CHANGE_SOCIETY_ENABLE_LIVE_QWEN_TESTS", "").lower() in {"1", "true", "yes"},
            enable_qwen_role_tools=os.getenv("CHANGE_SOCIETY_ENABLE_QWEN_ROLE_TOOLS", "1").lower() in {"1", "true", "yes"},
            qwen_max_tool_rounds=_int("CHANGE_SOCIETY_QWEN_MAX_TOOL_ROUNDS", 2, 0),
            mcp_tool_gateway_url=os.getenv("CHANGE_SOCIETY_MCP_TOOL_GATEWAY_URL", "").strip(),
            allowed_origins=tuple(item.strip() for item in os.getenv("CHANGE_SOCIETY_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:32501,http://127.0.0.1:32501").split(",") if item.strip()),
            managed_agents_config=os.getenv("CHANGE_SOCIETY_MANAGED_AGENTS_CONFIG", ""),
            webhook_agent_secret=os.getenv("CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET", ""),
            webhook_agent_timeout_seconds=_float("CHANGE_SOCIETY_WEBHOOK_AGENT_TIMEOUT_SECONDS", 30, 1),
            demo_auto_approve=demo_auto_approve,
        )
        if value.environment == "production" and value.model_provider != "qwen":
            raise ValueError("production requires CHANGE_SOCIETY_MODEL_PROVIDER=qwen")
        if value.environment == "production" and value.store != "postgresql":
            raise ValueError("production requires CHANGE_SOCIETY_STORE=postgresql")
        if value.model_provider == "qwen" and not value.qwen_api_key:
            raise ValueError("QWEN_API_KEY is required for Qwen Cloud")
        if value.store == "postgresql" and not value.database_url:
            raise ValueError("CHANGE_SOCIETY_DATABASE_URL is required for PostgreSQL")
        if value.model_provider not in {"qwen", "fake"} or value.store not in {"postgresql", "memory"}:
            raise ValueError("unsupported model provider or store")
        return value
