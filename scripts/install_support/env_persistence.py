from __future__ import annotations

import re
from pathlib import Path

from .install_log import detail

DEFAULT_DEV_PASSWORD = "change-society-dev-local"


def _upsert_line(text: str, key: str, value: str) -> str:
    line = f"{key}={value}"
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
    if pattern.search(text):
        return pattern.sub(line, text, count=1)
    return text.rstrip() + "\n" + line + "\n"


def ensure_persistence_env(env_path: Path, *, dry_run: bool) -> bool:
    """Point demo installs at local PostgreSQL (idempotent). Returns True if file changed."""
    if not env_path.is_file():
        return False

    text = env_path.read_text(encoding="utf-8")
    original = text

    user = _read_key(text, "AGENTCORE_POSTGRES_USER") or "agentcore"
    password = _read_key(text, "AGENTCORE_POSTGRES_PASSWORD") or DEFAULT_DEV_PASSWORD
    port = _read_key(text, "AGENTCORE_POSTGRES_PORT") or "32232"
    database = _read_key(text, "AGENTCORE_POSTGRES_DATABASE") or "agentcore"
    host = _read_key(text, "AGENTCORE_POSTGRES_HOST") or "127.0.0.1"

    text = _upsert_line(text, "CHANGE_SOCIETY_STORE", "postgresql")
    text = _upsert_line(text, "AGENTCORE_POSTGRES_USER", user)
    text = _upsert_line(text, "AGENTCORE_POSTGRES_PASSWORD", password)
    text = _upsert_line(text, "AGENTCORE_POSTGRES_PORT", port)
    text = _upsert_line(text, "AGENTCORE_POSTGRES_DATABASE", database)
    text = _upsert_line(text, "AGENTCORE_POSTGRES_HOST", host)
    db_url = f"postgresql://{user}:{password}@{host}:{port}/{database}"
    text = _upsert_line(text, "CHANGE_SOCIETY_DATABASE_URL", db_url)

    if text == original:
        detail(f"{env_path} already configured for PostgreSQL (CHANGE_SOCIETY_STORE=postgresql).")
        return False
    detail(f"Updating {env_path} for PostgreSQL-backed society runs (CHANGE_SOCIETY_STORE=postgresql).")
    if dry_run:
        return True
    env_path.write_text(text, encoding="utf-8")
    return True


def _read_key(text: str, key: str) -> str | None:
    match = re.search(rf"^{re.escape(key)}=(.*)$", text, re.MULTILINE)
    if not match:
        return None
    value = match.group(1).strip()
    return value or None
