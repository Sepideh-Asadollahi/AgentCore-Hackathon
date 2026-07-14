from __future__ import annotations

import os
import subprocess
from pathlib import Path


def load_dotenv_into_environ(env_path: Path) -> None:
    if not env_path.is_file():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if key and key not in os.environ:
            os.environ[key] = value.strip()


def apply_change_society_migrations(pack: Path, python: Path, *, dry_run: bool, wait: bool = True) -> None:
    script = pack / "scripts" / "apply_change_society_migrations.py"
    if not script.is_file():
        print(f"WARNING: missing {script}; skip SQL migrations.")
        return
    mig_dir = pack / "backend" / "change-society-service" / "migrations"
    files = sorted(mig_dir.glob("*.sql"))
    if not files:
        print(f"WARNING: no migrations under {mig_dir}")
        return
    cmd = [str(python), str(script)]
    if wait:
        cmd.append("--wait")
    if dry_run:
        cmd.append("--dry-run")
    print(f"→ {' '.join(cmd)}")
    if dry_run:
        return
    env = os.environ.copy()
    try:
        subprocess.run(cmd, cwd=pack, check=True, env=env)
    except subprocess.CalledProcessError:
        container = os.environ.get("CHANGE_SOCIETY_DEV_POSTGRES_CONTAINER", "change-society-dev-postgres")
        print(f"Python migration failed; trying docker exec into {container}…")
        for path in files:
            with path.open("rb") as handle:
                subprocess.run(
                    ["docker", "exec", "-i", container, "psql", "-U", "agentcore", "-d", "agentcore", "-f", "-"],
                    stdin=handle,
                    check=True,
                )
            print(f"Applied {path.name} via docker exec.")
