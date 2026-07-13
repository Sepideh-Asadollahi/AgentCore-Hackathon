"""Install helpers for hackathon/scripts/install.py (modular package)."""

from __future__ import annotations

from .banner import BANNER, print_banner
from .cmd import run_cmd
from .docker_runtime import (
    compose_cmd,
    docker_available,
    start_docker_compose_stack,
    start_docker_postgres,
)
from .interactive import gather_interactive_config
from .menu_options import PROFILE_OPTIONS, RUNTIME_OPTIONS
from .messages import narrative_for_runtime, production_hints
from .os_deps import install_os_dependencies
from .systemd_runtime import install_systemd_user_units, render_systemd_unit
from .types import ChoiceOption, RuntimeMode

__all__ = [
    "BANNER",
    "ChoiceOption",
    "PROFILE_OPTIONS",
    "RUNTIME_OPTIONS",
    "RuntimeMode",
    "compose_cmd",
    "docker_available",
    "gather_interactive_config",
    "install_os_dependencies",
    "install_systemd_user_units",
    "narrative_for_runtime",
    "print_banner",
    "production_hints",
    "render_systemd_unit",
    "run_cmd",
    "start_docker_compose_stack",
    "start_docker_postgres",
]
