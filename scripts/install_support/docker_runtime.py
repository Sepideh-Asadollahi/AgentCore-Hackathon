from __future__ import annotations

import os
import re
import shutil
import subprocess
from pathlib import Path

from .platform_detect import command_exists


def docker_available() -> bool:
    if not command_exists("docker"):
        return False
    try:
        subprocess.run(["docker", "info"], check=True, capture_output=True)
        return True
    except (subprocess.CalledProcessError, OSError):
        return False


def compose_cmd(_pack: Path) -> list[str] | None:
    if shutil.which("docker"):
        try:
            subprocess.run(
                ["docker", "compose", "version"],
                check=True,
                capture_output=True,
            )
            return ["docker", "compose"]
        except subprocess.CalledProcessError:
            pass
    if shutil.which("docker-compose"):
        return ["docker-compose"]
    return None


def start_docker_postgres(pack: Path, *, dry_run: bool) -> None:
    compose_file = pack / "deployments" / "compose.dev-postgres.yaml"
    cmd_base = compose_cmd(pack)
    if not cmd_base:
        raise SystemExit(
            "PostgreSQL via Docker is required but docker compose is not available. "
            "Example fix: bash install.sh --install-os-deps --non-interactive "
            "(Debian/Ubuntu: docker.io + docker-compose-v2) then re-run install."
        )
    env = os.environ.copy()
    env.setdefault("AGENTCORE_POSTGRES_PASSWORD", "change-society-dev-local")
    fixed_name = "change-society-dev-postgres"
    print("Starting PostgreSQL (Docker) for persisted society runs…")
    print("  Example connect: postgresql://agentcore:change-society-dev-local@127.0.0.1:32232/agentcore")
    env_path = pack / ".env"
    env_file_args: tuple[str, ...] = ()
    if env_path.is_file():
        env_file_args = ("--env-file", str(env_path))
    full = [*cmd_base, *env_file_args, "-f", str(compose_file), "up", "-d"]
    print(f"→ {' '.join(full)}")
    if dry_run:
        return

    running = subprocess.run(
        ["docker", "inspect", "-f", "{{.State.Running}}", fixed_name],
        capture_output=True,
        text=True,
    )
    if running.returncode == 0 and running.stdout.strip() == "true":
        print(f"PostgreSQL container {fixed_name} already running.")
        return

    try:
        subprocess.run(full, cwd=pack / "deployments", check=True, env=env)
    except subprocess.CalledProcessError:
        # Stale container with the fixed name but not owned by this compose project blocks recreate.
        subprocess.run(["docker", "rm", "-f", fixed_name], check=False)
        subprocess.run(full, cwd=pack / "deployments", check=True, env=env)


def _compose_file(pack: Path) -> Path:
    override = os.environ.get("CHANGE_SOCIETY_COMPOSE_FILE", "").strip()
    if override:
        path = Path(override)
        return path if path.is_absolute() else pack / path
    return pack / "deployments" / "compose.yaml"


def start_docker_compose_stack(pack: Path, *, dry_run: bool) -> None:
    compose_file = _compose_file(pack)
    cmd_base = compose_cmd(pack)
    if not cmd_base:
        raise SystemExit(
            "Docker runtime selected but docker compose is not available. "
            "Example fix: sudo apt install docker.io docker-compose-v2 && sudo systemctl start docker"
        )
    env_path = pack / ".env"
    if not env_path.is_file():
        raise SystemExit(
            f"Docker stack needs {env_path}. Copy .env.example and set "
            "QWEN_API_KEY and AGENTCORE_POSTGRES_PASSWORD."
        )
    text = env_path.read_text(encoding="utf-8")
    missing: list[str] = []
    smoke_compose = compose_file.name == "compose.smoke.yaml"
    required_keys = ("AGENTCORE_POSTGRES_PASSWORD",) if smoke_compose else ("QWEN_API_KEY", "AGENTCORE_POSTGRES_PASSWORD")
    for key in required_keys:
        if not re.search(rf"^{key}=.+", text, re.MULTILINE):
            missing.append(key)
    if missing:
        raise SystemExit(
            f"Docker runtime requires non-empty {', '.join(missing)} in .env. "
            "Example: QWEN_API_KEY=sk-... and AGENTCORE_POSTGRES_PASSWORD=choose-a-strong-password"
        )
    full = [
        *cmd_base,
        "--env-file",
        str(env_path),
        "-f",
        str(compose_file),
        "up",
        "-d",
        "--build",
    ]
    print(f"→ {' '.join(full)}")
    if dry_run:
        return
    subprocess.run(full, cwd=pack / "deployments", check=True)
