from __future__ import annotations

import re
from pathlib import Path

from .install_log import detail, info, mask_env_value

# Minimum keys for API + UI + Docker PostgreSQL + LangGraph worker (defaults from .env.example).
BOOT_ENV_KEYS: tuple[str, ...] = (
    "CHANGE_SOCIETY_MODEL_PROVIDER",
    "CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET",
    "AGENTCORE_WEBHOOK_SHARED_SECRET",
    "WORKER_PORT",
    "WORKER_LIVE_MODE",
    "WORKER_USE_LLM",
    "WORKER_RUNTIME_NAME",
    "QWEN_API_KEY",
    "QWEN_BASE_URL",
    "QWEN_MODEL",
    "CHANGE_SOCIETY_ENVIRONMENT",
    "CHANGE_SOCIETY_STORE",
    "CHANGE_SOCIETY_CONTEXT_TOKEN_BUDGET",
    "CHANGE_SOCIETY_ALLOWED_ORIGINS",
    "CHANGE_SOCIETY_API_PORT",
    "CHANGE_SOCIETY_WEB_PORT",
    "CHANGE_SOCIETY_API_HOST",
    "CHANGE_SOCIETY_LOG_LEVEL",
    "CHANGE_SOCIETY_MANAGED_AGENTS_CONFIG",
    "CHANGE_SOCIETY_WEBHOOK_AGENT_TIMEOUT_SECONDS",
    "CHANGE_SOCIETY_DEMO_AUTO_APPROVE",
    "CHANGE_SOCIETY_ASYNC_RUN_CREATE",
    "CHANGE_SOCIETY_PROXY_TIMEOUT_MS",
    "NEXT_PUBLIC_SOCIETY_RUN_POLL_MS",
    "CHANGE_SOCIETY_DATABASE_URL",
    "AGENTCORE_POSTGRES_DATABASE",
    "AGENTCORE_POSTGRES_USER",
    "AGENTCORE_POSTGRES_PASSWORD",
    "AGENTCORE_POSTGRES_PORT",
    "AGENTCORE_POSTGRES_HOST",
    "NEXT_PUBLIC_CHANGE_SOCIETY_API_URL",
    "NEXT_PUBLIC_CHANGE_SOCIETY_PROJECT_ID",
    "NEXT_PUBLIC_CHANGE_SOCIETY_TENANT_ID",
    "NEXT_PUBLIC_CHANGE_SOCIETY_WORKSPACE_ID",
)

PRESERVE_IF_NONEMPTY: frozenset[str] = frozenset(
    {
        "QWEN_API_KEY",
        "AGENTCORE_POSTGRES_PASSWORD",
        "CHANGE_SOCIETY_DATABASE_URL",
        "CHANGE_SOCIETY_ALLOWED_ORIGINS",
        "CHANGE_SOCIETY_WEB_PORT",
        "CHANGE_SOCIETY_API_HOST",
    }
)

_ASSIGNMENT = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$")


def _parse_assignment_line(line: str) -> tuple[str, str] | None:
    stripped = line.strip()
    if not stripped:
        return None
    if stripped.startswith("#"):
        inner = stripped.lstrip("#").strip()
        if not inner:
            return None
        match = _ASSIGNMENT.match(inner)
    else:
        match = _ASSIGNMENT.match(stripped)
    if not match:
        return None
    return match.group(1), match.group(2)


def load_assignments_from_example(text: str, *, keys: frozenset[str]) -> dict[str, str]:
    """Active KEY=value first; then commented # KEY=value for keys still missing."""
    found: dict[str, str] = {}
    for raw in text.splitlines():
        if raw.strip().startswith("#"):
            continue
        parsed = _parse_assignment_line(raw)
        if parsed and parsed[0] in keys:
            found[parsed[0]] = parsed[1]
    for raw in text.splitlines():
        if not raw.strip().startswith("#"):
            continue
        parsed = _parse_assignment_line(raw)
        if parsed and parsed[0] in keys and parsed[0] not in found:
            found[parsed[0]] = parsed[1]
    return found


def read_env_file(path: Path) -> dict[str, str]:
    if not path.is_file():
        return {}
    out: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        if raw.strip().startswith("#"):
            continue
        parsed = _parse_assignment_line(raw)
        if parsed:
            out[parsed[0]] = parsed[1]
    return out


def render_boot_env(values: dict[str, str]) -> str:
    lines = [
        "# Synced from .env.example by install.sh — minimum to run API, UI, Docker PostgreSQL, LangGraph worker.",
        "# Set QWEN_API_KEY for live Qwen. Full template: .env.example",
        "",
    ]
    for key in BOOT_ENV_KEYS:
        if key in values:
            lines.append(f"{key}={values[key]}")
    lines.append("")
    return "\n".join(lines)


def ensure_boot_env_from_example(pack: Path, env_path: Path, *, dry_run: bool) -> bool:
    example_path = pack / ".env.example"
    if not example_path.is_file():
        return False

    from_example = load_assignments_from_example(
        example_path.read_text(encoding="utf-8"),
        keys=frozenset(BOOT_ENV_KEYS),
    )
    from_example.setdefault("CHANGE_SOCIETY_DEMO_AUTO_APPROVE", "1")
    from_example.setdefault("CHANGE_SOCIETY_ASYNC_RUN_CREATE", "1")
    from_example.setdefault("CHANGE_SOCIETY_PROXY_TIMEOUT_MS", "900000")
    from_example.setdefault("NEXT_PUBLIC_SOCIETY_RUN_POLL_MS", "900000")
    if not from_example.get("CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET", "").strip():
        from_example["CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET"] = "integrator-demo-secret-change-me"

    existing = read_env_file(env_path)
    merged: dict[str, str] = {}
    for key in BOOT_ENV_KEYS:
        if key in from_example:
            merged[key] = from_example[key]
        elif key in existing:
            merged[key] = existing[key]
    for key in PRESERVE_IF_NONEMPTY:
        if existing.get(key, "").strip():
            merged[key] = existing[key]

    body = render_boot_env(merged)
    if env_path.is_file() and env_path.read_text(encoding="utf-8") == body:
        detail(f"{env_path} already has minimum boot settings from .env.example.")
        return False

    action = "Writing" if not env_path.is_file() else "Updating"
    detail(f"{action} {env_path} from .env.example (minimum boot variables).")
    for key in BOOT_ENV_KEYS:
        if key in merged:
            info(f"  {key}={mask_env_value(key, merged[key])}")
    if dry_run:
        return True
    env_path.write_text(body, encoding="utf-8")
    return True
