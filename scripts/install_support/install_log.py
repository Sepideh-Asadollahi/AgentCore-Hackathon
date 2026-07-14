from __future__ import annotations

import os
import subprocess
import sys
import time
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

_VERBOSE = os.environ.get("AGENTCORE_INSTALL_VERBOSE", "1").strip().lower() not in {
    "0",
    "false",
    "no",
    "quiet",
}


def set_verbose(enabled: bool) -> None:
    global _VERBOSE
    _VERBOSE = enabled


def verbose() -> bool:
    return _VERBOSE


def _flush_print(msg: str = "") -> None:
    print(msg, flush=True)


def info(msg: str) -> None:
    if _VERBOSE:
        _flush_print(msg)


def detail(msg: str) -> None:
    """Always shown (errors, step titles, dry-run)."""
    _flush_print(msg)


def mask_env_value(key: str, value: str) -> str:
    upper = key.upper()
    if any(token in upper for token in ("PASSWORD", "SECRET", "API_KEY", "TOKEN")) and value.strip():
        return "<set>"
    if not value.strip():
        return "<empty>"
    return value


@contextmanager
def install_step(step: int, total: int, title: str, *, subtitle: str = "") -> Iterator[None]:
    bar = "─" * 72
    detail("")
    detail(bar)
    detail(f"[Step {step}/{total}] {title}")
    if subtitle:
        detail(f"  {subtitle}")
    detail(bar)
    started = time.monotonic()
    try:
        yield
        elapsed = time.monotonic() - started
        detail(f"✓ Step {step}/{total} done ({elapsed:.1f}s): {title}")
    except BaseException:
        elapsed = time.monotonic() - started
        detail(f"✗ Step {step}/{total} failed ({elapsed:.1f}s): {title}")
        raise


def run_subprocess(
    cmd: list[str],
    *,
    dry_run: bool,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    label: str | None = None,
) -> None:
    cwd_s = f" (cwd={cwd})" if cwd else ""
    line = label or " ".join(cmd)
    detail(f"→ {line}{cwd_s}")
    if dry_run:
        return
    if _VERBOSE:
        info(f"  running: {' '.join(cmd)}")
    merged = os.environ.copy()
    if env:
        merged.update(env)
    merged.setdefault("PYTHONUNBUFFERED", "1")
    subprocess.run(cmd, cwd=cwd, check=True, env=merged)


def run_cmd(cmd: list[str], *, dry_run: bool, cwd: Path | None = None) -> None:
    run_subprocess(cmd, dry_run=dry_run, cwd=cwd)
