from __future__ import annotations

from pathlib import Path

from .install_log import run_subprocess


def run_cmd(cmd: list[str], *, dry_run: bool, cwd: Path | None = None) -> None:
    run_subprocess(cmd, dry_run=dry_run, cwd=cwd)
