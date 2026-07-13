from __future__ import annotations

import subprocess
from pathlib import Path


def run_cmd(cmd: list[str], *, dry_run: bool, cwd: Path | None = None) -> None:
    label = " ".join(cmd)
    print(f"→ {label}")
    if dry_run:
        return
    subprocess.run(cmd, cwd=cwd, check=True)
