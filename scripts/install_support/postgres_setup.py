from __future__ import annotations

import os
import subprocess
from pathlib import Path

from .install_log import detail, info, run_subprocess


def load_dotenv_into_environ(env_path: Path) -> None:
    if not env_path.is_file():
        return
    loaded = 0
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if key and key not in os.environ:
            os.environ[key] = value.strip()
            loaded += 1
    info(f"Loaded {loaded} variable(s) from {env_path} into environment.")


def apply_change_society_migrations(pack: Path, python: Path, *, dry_run: bool, wait: bool = True) -> None:
    script = pack / "scripts" / "apply_change_society_migrations.py"
    if not script.is_file():
        detail(f"WARNING: missing {script}; skip SQL migrations.")
        return
    mig_dir = pack / "backend" / "change-society-service" / "migrations"
    files = sorted(mig_dir.glob("*.sql"))
    if not files:
        detail(f"WARNING: no migrations under {mig_dir}")
        return
    info(f"Migration files: {', '.join(p.name for p in files)}")
    cmd = [str(python), "-u", str(script)]
    if wait:
        cmd.append("--wait")
    if dry_run:
        cmd.append("--dry-run")
    if dry_run:
        detail(f"→ {' '.join(cmd)}")
        return
    env = os.environ.copy()
    try:
        run_subprocess(cmd, cwd=pack, dry_run=False, env=env, label="apply_change_society_migrations.py")
    except Exception:
        container = os.environ.get("CHANGE_SOCIETY_DEV_POSTGRES_CONTAINER", "change-society-dev-postgres")
        detail(f"Python migration failed; trying docker exec into {container}…")
        for path in files:
            detail(f"Applying {path.name} via docker exec psql…")
            with path.open("rb") as handle:
                subprocess.run(
                    ["docker", "exec", "-i", container, "psql", "-U", "agentcore", "-d", "agentcore", "-f", "-"],
                    stdin=handle,
                    check=True,
                )
            detail(f"Applied {path.name} via docker exec.")
