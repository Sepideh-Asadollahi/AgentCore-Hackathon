from __future__ import annotations

import platform
import re
import shutil
import subprocess
from pathlib import Path


def linux_debian_family() -> bool:
    if platform.system() != "Linux":
        return False
    try:
        data = Path("/etc/os-release").read_text(encoding="utf-8")
    except OSError:
        return False
    return "ID=debian" in data or "ID=ubuntu" in data or "ID_LIKE=debian" in data


def command_exists(name: str) -> bool:
    return shutil.which(name) is not None


def python_has_venv_module(python_exe: str) -> bool:
    try:
        subprocess.run(
            [python_exe, "-m", "venv", "--help"],
            check=True,
            capture_output=True,
            text=True,
        )
        return True
    except (subprocess.CalledProcessError, OSError):
        return False


def node_major_version() -> int | None:
    if not shutil.which("npm"):
        return None
    try:
        out = subprocess.run(
            ["node", "--version"],
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()
    except (subprocess.CalledProcessError, OSError):
        return None
    m = re.match(r"v?(\d+)", out)
    return int(m.group(1)) if m else None
