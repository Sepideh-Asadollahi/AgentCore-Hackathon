from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from .install_log import detail, info, run_subprocess
from .docker_runtime import compose_cmd
from .platform_detect import (
    command_exists,
    linux_debian_family,
    node_major_version,
    python_has_venv_module,
)
from .types import RuntimeMode


def try_sudo_apt_install(packages: list[str], *, dry_run: bool) -> bool:
    if not packages:
        return True
    if dry_run:
        detail(f"→ would run: sudo apt-get install -y {' '.join(packages)}")
        return True
    if not command_exists("sudo"):
        detail("WARNING: sudo not found; install OS packages manually.")
        return False
    if not command_exists("apt-get"):
        detail("WARNING: apt-get not found; install OS packages manually.")
        return False
    run_subprocess(["sudo", "apt-get", "update"], dry_run=False)
    run_subprocess(["sudo", "apt-get", "install", "-y", *packages], dry_run=False, label=f"apt-get install: {' '.join(packages)}")
    return True


def collect_os_package_wishes(
    *,
    need_venv: bool,
    need_node: bool,
    need_docker: bool,
) -> list[str]:
    pkgs: list[str] = []
    if need_venv and linux_debian_family():
        py = f"python{sys.version_info.major}.{sys.version_info.minor}-venv"
        pkgs.extend([py, "ca-certificates", "curl"])
    if need_node and linux_debian_family():
        pkgs.extend(["nodejs", "npm"])
    if need_docker and linux_debian_family():
        pkgs.extend(["docker.io", "docker-compose-v2"])
    seen: set[str] = set()
    out: list[str] = []
    for p in pkgs:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out


def install_os_dependencies(
    *,
    install_os_deps: bool,
    runtime: RuntimeMode,
    with_postgres: bool = False,
    skip_frontend: bool,
    dry_run: bool,
) -> None:
    """Best-effort apt packages on Debian/Ubuntu when requested."""
    if not install_os_deps:
        info("Skipping OS apt packages (--install-os-deps not set; bootstrap may have run from install.sh).")
        return
    if not linux_debian_family():
        detail(
            "NOTE: --install-os-deps is supported on Debian/Ubuntu via apt. "
            "On this OS, install Python venv, Node 20+, and Docker manually."
        )
        return

    info(f"Checking OS packages (runtime={runtime}, postgres={with_postgres}, skip_frontend={skip_frontend})")
    need_venv = not python_has_venv_module(sys.executable)
    need_node = not skip_frontend and (not command_exists("npm") or (node_major_version() or 0) < 18)
    want_docker = runtime == "docker" or with_postgres
    need_docker = want_docker and (
        not command_exists("docker") or compose_cmd(Path(".")) is None
    )

    pkgs = collect_os_package_wishes(need_venv=need_venv, need_node=need_node, need_docker=need_docker)
    if not pkgs:
        if want_docker and not dry_run and compose_cmd(Path(".")) is None:
            raise SystemExit(
                "PostgreSQL requires 'docker compose'. Re-run with: bash install.sh --install-os-deps --non-interactive"
            )
        detail("OS dependency check: nothing extra to install via apt.")
        return
    detail(f"Installing OS packages via apt: {', '.join(pkgs)}")
    try_sudo_apt_install(pkgs, dry_run=dry_run)
    if need_docker and command_exists("docker") and not dry_run:
        try:
            run_subprocess(["sudo", "systemctl", "enable", "--now", "docker"], dry_run=False, label="Enable Docker service")
        except subprocess.CalledProcessError:
            detail("WARNING: could not enable docker service; you may need: sudo systemctl start docker")
        if compose_cmd(Path(".")) is None:
            raise SystemExit(
                "Docker is installed but 'docker compose' is missing. "
                "Re-run: bash install.sh --install-os-deps --non-interactive "
                "(installs docker-compose-v2 on Debian/Ubuntu)."
            )
