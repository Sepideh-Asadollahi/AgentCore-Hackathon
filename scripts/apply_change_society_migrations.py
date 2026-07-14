#!/usr/bin/env python3
"""Apply Change Society SQL migrations (idempotent CREATE IF NOT EXISTS)."""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from pack_paths import pack_root  # noqa: E402


def migrations_dir(pack: Path) -> Path:
    return pack / "backend" / "change-society-service" / "migrations"


def database_url_from_env() -> str:
    url = os.environ.get("CHANGE_SOCIETY_DATABASE_URL", "").strip()
    if url:
        return url
    user = os.environ.get("AGENTCORE_POSTGRES_USER", "agentcore").strip()
    password = os.environ.get("AGENTCORE_POSTGRES_PASSWORD", "change-society-dev-local").strip()
    host = os.environ.get("AGENTCORE_POSTGRES_HOST", "127.0.0.1").strip()
    port = os.environ.get("AGENTCORE_POSTGRES_PORT", "32232").strip()
    db = os.environ.get("AGENTCORE_POSTGRES_DATABASE", "agentcore").strip()
    return f"postgresql://{user}:{password}@{host}:{port}/{db}"


def wait_for_db(url: str, *, timeout_s: float = 90.0) -> None:
    import psycopg

    deadline = time.monotonic() + timeout_s
    last_err: Exception | None = None
    while time.monotonic() < deadline:
        try:
            with psycopg.connect(url.replace("postgresql+psycopg://", "postgresql://", 1), connect_timeout=3):
                return
        except Exception as exc:  # noqa: BLE001 — retry until timeout
            last_err = exc
            time.sleep(1.5)
    raise SystemExit(f"PostgreSQL not reachable within {timeout_s}s: {last_err}")


def apply_sql_files(url: str, files: list[Path], *, dry_run: bool) -> None:
    if dry_run:
        for path in files:
            print(f"Would apply migration {path.name}")
        return
    import psycopg

    conn_url = url.replace("postgresql+psycopg://", "postgresql://", 1)
    with psycopg.connect(conn_url) as conn:
        with conn.cursor() as cur:
            for path in files:
                sql = path.read_text(encoding="utf-8")
                print(f"Applying {path.name}…")
                cur.execute(sql)
        conn.commit()
    print(f"Applied {len(files)} migration file(s).")


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply Change Society PostgreSQL migrations.")
    parser.add_argument("--database-url", default="", help="Override CHANGE_SOCIETY_DATABASE_URL")
    parser.add_argument("--wait", action="store_true", help="Wait until PostgreSQL accepts connections")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    pack = pack_root()
    mig = migrations_dir(pack)
    files = sorted(mig.glob("*.sql"))
    if not files:
        raise SystemExit(f"No .sql files under {mig}")

    url = args.database_url.strip() or database_url_from_env()
    if args.wait:
        print(f"Waiting for PostgreSQL at {url.split('@')[-1]}…")
        wait_for_db(url)
    apply_sql_files(url, files, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
