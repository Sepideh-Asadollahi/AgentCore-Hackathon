#!/usr/bin/env python3
"""ponytail: minimal self-check for env upsert (run from pack root with PYTHONPATH set)."""
from __future__ import annotations

import tempfile
from pathlib import Path

from change_society.infrastructure.judge_runtime_config import upsert_env_file


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / ".env"
        path.write_text("FOO=bar\nQWEN_API_KEY=old\n", encoding="utf-8")
        upsert_env_file(path, {"QWEN_API_KEY": "new-key", "WORKER_LIVE_MODE": "1"})
        text = path.read_text(encoding="utf-8")
        assert "QWEN_API_KEY=new-key" in text
        assert "WORKER_LIVE_MODE=1" in text
        assert "FOO=bar" in text
        assert "old" not in text
    print("ok")


if __name__ == "__main__":
    main()
