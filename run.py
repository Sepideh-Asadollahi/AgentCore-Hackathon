#!/usr/bin/env python3
"""Start the AgentCore Change Society API (FastAPI + uvicorn)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

_RUN_FILE = Path(__file__).resolve()
_SCRIPTS = _RUN_FILE.parent / "scripts"


def _bootstrap_pack_paths() -> None:
    if str(_SCRIPTS) not in sys.path:
        sys.path.insert(0, str(_SCRIPTS))


def ensure_project_venv() -> None:
    """Re-exec with pack .venv (or monorepo parent .venv); create venv via install if missing."""
    _bootstrap_pack_paths()
    from pack_paths import pack_root, python_bin, venv_base  # noqa: E402

    pack = pack_root(_RUN_FILE)
    try:
        vpy = python_bin(pack)
    except SystemExit:
        print("No .venv found — running install (demo profile, backend only)…", file=sys.stderr)
        subprocess.run(
            [sys.executable, str(pack / "scripts" / "install.py"), "--non-interactive", "--profile", "demo", "--runtime", "none", "--skip-frontend"],
            cwd=pack,
            check=True,
        )
        vpy = python_bin(pack)

    base = venv_base(pack)
    venv_dir = base / ".venv"
    os.environ["VIRTUAL_ENV"] = str(venv_dir)
    bin_dir = str(venv_dir / "bin")
    path_prefix = bin_dir + os.pathsep
    if not os.environ.get("PATH", "").startswith(path_prefix):
        os.environ["PATH"] = path_prefix + os.environ.get("PATH", "")

    if Path(sys.executable).resolve() != vpy.resolve():
        os.execv(str(vpy), [str(vpy), str(_RUN_FILE), *sys.argv[1:]])


ensure_project_venv()

from pack_paths import init_script  # noqa: E402

PACK = init_script(__file__)


def load_dotenv() -> None:
    env_file = PACK / ".env"
    if not env_file.is_file():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, _, value = stripped.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


def main() -> int:
    load_dotenv()
    host = os.environ.get("CHANGE_SOCIETY_API_HOST", "0.0.0.0")
    port = int(os.environ.get("CHANGE_SOCIETY_API_PORT", "32500"))

    import uvicorn

    log_level = os.environ.get("CHANGE_SOCIETY_LOG_LEVEL", "debug").lower()
    print(f"AgentCore API pack={PACK} listen={host}:{port} log_level={log_level}")
    uvicorn.run("change_society.main:app", host=host, port=port, log_level=log_level)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
