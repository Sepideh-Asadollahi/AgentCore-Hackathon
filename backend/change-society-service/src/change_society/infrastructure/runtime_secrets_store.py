from __future__ import annotations

import os
from datetime import datetime, timezone

import psycopg
from psycopg.rows import dict_row

ALLOWED_SECRET_KEYS = frozenset({"QWEN_API_KEY", "QWEN_BASE_URL", "QWEN_MODEL"})


def _database_url() -> str:
    url = os.getenv("CHANGE_SOCIETY_DATABASE_URL", "").strip()
    if not url:
        raise ValueError("CHANGE_SOCIETY_DATABASE_URL is required to store runtime secrets")
    return url.replace("postgresql+psycopg://", "postgresql://", 1)


def upsert_runtime_secrets(values: dict[str, str]) -> None:
    for key in values:
        if key not in ALLOWED_SECRET_KEYS:
            raise ValueError(f"Refusing to store disallowed secret key: {key}")
    if not values:
        return
    now = datetime.now(timezone.utc)
    with psycopg.connect(_database_url(), autocommit=True, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            for key, value in values.items():
                cur.execute(
                    """
                    INSERT INTO change_society_runtime_secrets (secret_key, secret_value, updated_at)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (secret_key) DO UPDATE
                    SET secret_value = EXCLUDED.secret_value, updated_at = EXCLUDED.updated_at
                    """,
                    (key, value, now),
                )


def runtime_secret_status() -> dict[str, object]:
    """Public metadata only — never exposes QWEN_API_KEY."""
    out: dict[str, object] = {"qwen_api_key_configured": False, "qwen_base_url": None, "qwen_model": None}
    try:
        with psycopg.connect(_database_url(), autocommit=True, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT secret_key, secret_value FROM change_society_runtime_secrets WHERE secret_key = ANY(%s)",
                    (list(ALLOWED_SECRET_KEYS),),
                )
                rows = cur.fetchall()
    except (psycopg.Error, ValueError):
        return out
    for row in rows:
        key = row["secret_key"]
        val = row["secret_value"]
        if key == "QWEN_API_KEY" and val.strip():
            out["qwen_api_key_configured"] = True
        elif key == "QWEN_BASE_URL":
            out["qwen_base_url"] = val
        elif key == "QWEN_MODEL":
            out["qwen_model"] = val
    return out


def delete_runtime_secrets(keys: frozenset[str] | None = None) -> int:
    """Remove stored secrets (returns rows deleted). Never logs values."""
    target = frozenset(keys) if keys is not None else ALLOWED_SECRET_KEYS
    for key in target:
        if key not in ALLOWED_SECRET_KEYS:
            raise ValueError(f"Refusing to delete disallowed secret key: {key}")
    if not target:
        return 0
    with psycopg.connect(_database_url(), autocommit=True, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM change_society_runtime_secrets WHERE secret_key = ANY(%s)",
                (list(target),),
            )
            return int(cur.rowcount or 0)
