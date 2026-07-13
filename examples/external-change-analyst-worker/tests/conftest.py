"""Test import paths for the reference LangGraph worker."""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
for directory in (
    ROOT / "hackathon" / "examples" / "external-change-analyst-worker" / "src",
    ROOT / "hackathon" / "sdk" / "python",
    ROOT / "hackathon" / "backend" / "change-society-service" / "src",
):
    path = str(directory)
    if path not in sys.path:
        sys.path.insert(0, path)

os.environ.setdefault("AGENTCORE_WEBHOOK_SHARED_SECRET", "integrator-demo-secret-change-me")
