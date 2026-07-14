#!/usr/bin/env python3
"""Sync minimum boot .env from .env.example (same as install.sh)."""

from __future__ import annotations

import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from pack_paths import pack_root  # noqa: E402
from install_support.env_bootstrap import ensure_boot_env_from_example  # noqa: E402


def main() -> int:
    pack = pack_root()
    ensure_boot_env_from_example(pack, pack / ".env", dry_run=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
