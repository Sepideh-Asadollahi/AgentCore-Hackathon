from __future__ import annotations

import logging
import os
import re
import subprocess
import time
from pathlib import Path
from typing import Any

import httpx

_log = logging.getLogger(__name__)

_ASSIGNMENT = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$")
_ALLOWED_KEYS = frozenset(
    {
        "QWEN_API_KEY",
        "QWEN_BASE_URL",
        "QWEN_MODEL",
        "WORKER_LIVE_MODE",
        "WORKER_USE_LLM",
        "WORKER_RUNTIME_NAME",
    }
)


def pack_env_path() -> Path:
    root = os.getenv("CHANGE_SOCIETY_PACK_ROOT", "").strip()
    if root:
        return Path(root).resolve() / ".env"
    return (Path.cwd() / ".env").resolve()


def upsert_env_file(env_path: Path, updates: dict[str, str]) -> None:
    if not updates:
        return
    for key in updates:
        if key not in _ALLOWED_KEYS:
            raise ValueError(f"Refusing to write disallowed env key: {key}")

    lines: list[str] = []
    if env_path.is_file():
        lines = env_path.read_text(encoding="utf-8").splitlines()
    seen: set[str] = set()
    out: list[str] = []
    for raw in lines:
        parsed = _ASSIGNMENT.match(raw.strip()) if raw.strip() and not raw.strip().startswith("#") else None
        if parsed and parsed.group(1) in updates:
            key = parsed.group(1)
            out.append(f"{key}={updates[key]}")
            seen.add(key)
        else:
            out.append(raw)
    for key, value in updates.items():
        if key not in seen:
            out.append(f"{key}={value}")
    env_path.parent.mkdir(parents=True, exist_ok=True)
    env_path.write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")


def _systemd_user_env() -> dict[str, str]:
    env = os.environ.copy()
    if "XDG_RUNTIME_DIR" not in env:
        env["XDG_RUNTIME_DIR"] = f"/run/user/{os.getuid()}"
    return env


def restart_systemd_user_units(unit_names: tuple[str, ...]) -> list[str]:
    restarted: list[str] = []
    env = _systemd_user_env()
    for unit in unit_names:
        subprocess.run(
            ["systemctl", "--user", "restart", unit],
            check=True,
            env=env,
            capture_output=True,
            text=True,
        )
        restarted.append(unit)
    return restarted


def poll_worker_ready(port: int = 32510, *, attempts: int = 15, sleep_s: float = 0.4) -> dict[str, Any]:
    url = f"http://127.0.0.1:{port}/ready"
    last: dict[str, Any] = {"ready": False}
    for _ in range(attempts):
        try:
            response = httpx.get(url, timeout=2.0)
            if response.status_code == 200:
                last = response.json()
                if last.get("status") == "ok":
                    return last
        except httpx.HTTPError:
            pass
        time.sleep(sleep_s)
    return last


def apply_judge_runtime_config(
    *,
    qwen_api_key: str | None,
    qwen_base_url: str | None,
    qwen_model: str | None,
    restart_worker: bool,
    restart_api: bool,
) -> dict[str, Any]:
    updates: dict[str, str] = {
        "WORKER_LIVE_MODE": "1",
        "WORKER_USE_LLM": "1",
        "WORKER_RUNTIME_NAME": "langgraph-sdk-society-worker",
    }
    if qwen_api_key is not None and qwen_api_key.strip():
        updates["QWEN_API_KEY"] = qwen_api_key.strip()
    if qwen_base_url is not None and qwen_base_url.strip():
        updates["QWEN_BASE_URL"] = qwen_base_url.strip()
    if qwen_model is not None and qwen_model.strip():
        updates["QWEN_MODEL"] = qwen_model.strip()

    if "QWEN_API_KEY" not in updates:
        raise ValueError("qwen_api_key is required to update server runtime")

    env_path = pack_env_path()
    upsert_env_file(env_path, updates)

    db_secrets = {k: v for k, v in updates.items() if k in {"QWEN_API_KEY", "QWEN_BASE_URL", "QWEN_MODEL"}}
    if db_secrets:
        from .runtime_secrets_store import upsert_runtime_secrets

        upsert_runtime_secrets(db_secrets)

    _log.info("Judge runtime: updated %s (%d keys) + database secrets", env_path, len(updates))

    units: list[str] = []
    if restart_worker:
        units.append("change-society-langgraph-worker.service")
    if restart_api:
        units.append("change-society-api.service")

    restarted = restart_systemd_user_units(tuple(units)) if units else []

    worker_port = int(os.getenv("WORKER_PORT", "32510"))
    worker_health = poll_worker_ready(worker_port) if restart_worker else {}

    return {
        "env_path": str(env_path),
        "keys_updated": sorted(updates.keys()),
        "restarted_units": restarted,
        "worker_ready": worker_health,
    }
