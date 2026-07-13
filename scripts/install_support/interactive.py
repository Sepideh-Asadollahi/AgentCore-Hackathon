from __future__ import annotations

import sys

from .banner import print_banner
from .docker_runtime import docker_available
from .menu_options import PROFILE_OPTIONS, RUNTIME_OPTIONS
from .platform_detect import (
    command_exists,
    linux_debian_family,
    node_major_version,
    python_has_venv_module,
)
from .prompts import prompt_choice, prompt_yes_no
from .types import RuntimeMode


def gather_interactive_config(
    *,
    profile: str | None,
    runtime: str | None,
    install_os_deps: bool | None,
    with_postgres: bool | None,
) -> tuple[str, RuntimeMode, bool, bool]:
    print_banner()
    prof = profile or prompt_choice(
        "Install profile?",
        PROFILE_OPTIONS,
        default_key="demo",
    )
    if prof == "production":
        return prof, "none", False, False

    os_deps = install_os_deps
    if os_deps is None:
        need_os = False
        if linux_debian_family():
            need_os = not python_has_venv_module(sys.executable) or (
                not command_exists("npm") or (node_major_version() or 0) < 18
            )
        os_deps = prompt_yes_no(
            "Install missing OS packages via apt (Debian/Ubuntu, uses sudo)?",
            default=need_os,
            example_yes="y  → installs python3.12-venv, nodejs, npm, docker.io when needed",
            example_no="n  → you install Python venv + Node 20+ yourself, then re-run install.sh",
        )

    rt: RuntimeMode
    if runtime:
        rt = runtime  # type: ignore[assignment]
    else:
        rt = prompt_choice(  # type: ignore[assignment]
            "How should the app run after install?",
            RUNTIME_OPTIONS,
            default_key="manual",
        )

    pg = with_postgres
    if pg is None and docker_available() and rt != "docker":
        pg = prompt_yes_no(
            "Start optional PostgreSQL in Docker for local DB experiments (demo still uses in-memory store)?",
            default=False,
            example_yes="y  → docker compose -f hackathon/deployments/compose.dev-postgres.yaml up -d",
            example_no="n  → skip; demo profile needs no database container",
        )
    elif pg is None:
        pg = False

    return prof, rt, os_deps, pg
