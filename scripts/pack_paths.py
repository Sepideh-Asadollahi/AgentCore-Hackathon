"""Resolve AgentCore pack root and paths (monorepo hackathon/ or standalone publish root)."""

from __future__ import annotations

import os
import sys
from pathlib import Path


def _is_pack(directory: Path) -> bool:
    return (
        (directory / "scripts" / "install.py").is_file()
        and (directory / "backend" / "change-society-service" / "src" / "change_society").is_dir()
    )


def pack_root(start: Path | None = None) -> Path:
    """Directory that contains install.sh, backend/, frontend/, scripts/install.py."""
    env_root = os.getenv("PACK_ROOT", "").strip()
    if env_root:
        candidate = Path(env_root).resolve()
        if _is_pack(candidate):
            return candidate

    here = (start or Path(__file__)).resolve()
    if here.is_file():
        here = here.parent
    best: Path | None = None
    for directory in (here, *here.parents):
        for candidate in (directory, directory / "hackathon"):
            if not _is_pack(candidate):
                continue
            if candidate.name == "hackathon":
                return candidate
            if best is None:
                best = candidate
    if best is not None:
        return best
    raise SystemExit(
        "Cannot find AgentCore pack root. Run install from the tree that contains "
        "install.sh, backend/change-society-service/, and scripts/install.py."
    )


def venv_base(pack: Path) -> Path:
    """Directory holding .venv (pack first; legacy monorepo parent when pack is hackathon/)."""
    py = pack / ".venv" / "bin" / "python"
    if py.is_file():
        return pack
    if pack.name == "hackathon":
        parent_py = pack.parent / ".venv" / "bin" / "python"
        if parent_py.is_file():
            return pack.parent
    return pack


def python_bin(pack: Path | None = None) -> Path:
    pack = pack or pack_root()
    base = venv_base(pack)
    py = base / ".venv" / "bin" / "python"
    if not py.is_file():
        raise SystemExit(
            f"Missing virtualenv at {base / '.venv'}. From {pack} run: bash install.sh"
        )
    return py


def backend_src(pack: Path) -> Path:
    return pack / "backend" / "change-society-service" / "src"


def sdk_python(pack: Path) -> Path:
    return pack / "sdk" / "python"


def pythonpath_entries(pack: Path) -> list[str]:
    return [str(backend_src(pack)), str(sdk_python(pack))]


def apply_pythonpath(pack: Path) -> None:
    for entry in pythonpath_entries(pack):
        if entry not in sys.path:
            sys.path.insert(0, entry)


def init_script(from_file: str | Path) -> Path:
    """Set sys.path for backend + SDK; return pack root."""
    pack = pack_root(Path(from_file))
    apply_pythonpath(pack)
    return pack


def pytest_dir(pack: Path) -> Path | None:
    for candidate in (
        pack / "tests" / "backend" / "change-society-service",
        pack.parent / "tests" / "backend" / "change-society-service",
    ):
        if candidate.is_dir():
            return candidate
    return None


def e2e_change_society_dir(pack: Path) -> Path | None:
    for candidate in (
        pack.parent / "tests" / "e2e" / "change-society",
        pack / "tests" / "e2e" / "change-society",
    ):
        if candidate.is_dir():
            return candidate
    return None


def live_change_society_dir(pack: Path) -> Path | None:
    for candidate in (
        pack.parent / "tests" / "live" / "change-society",
        pack / "tests" / "live" / "change-society",
    ):
        if candidate.is_dir():
            return candidate
    return None


if __name__ == "__main__":
    _pack = pack_root()
    assert (_pack / "install.sh").is_file()
    _tests = pytest_dir(_pack)
    assert _tests is not None, f"no pytest dir near {_pack}"
    print("pack_paths ok:", _pack, "tests:", _tests)
