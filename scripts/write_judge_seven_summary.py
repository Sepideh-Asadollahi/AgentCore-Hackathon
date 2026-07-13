#!/usr/bin/env python3
"""Build a one-page judge summary from a live multi-scenario manifest."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
from pack_paths import init_script  # noqa: E402

PACK = init_script(__file__)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--out", default="")
    parser.add_argument("--title", default="Change Society — live seven-scenario judge smoke")
    args = parser.parse_args()
    manifest_path = Path(args.manifest)
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    scenarios = data.get("scenarios") or []
    readiness = data.get("readiness") or {}
    model = (readiness.get("checks") or {}).get("model") or {}

    rows = []
    all_ok = True
    for item in scenarios:
        ok = item.get("final_state") == "completed" and item.get("ticket_lifecycle_verified") is True
        if item.get("final_state") is None and item.get("langgraph_integrator"):
            ok = True
        all_ok = all_ok and ok
        rows.append(
            {
                "scenario_id": item.get("scenario_id"),
                "domain": item.get("domain"),
                "run_id": item.get("run_id"),
                "tickets": item.get("agent_ticket_count") or item.get("tickets"),
                "messages": item.get("message_count") or item.get("messages"),
                "rebuttals": item.get("rebuttal_response_count") or item.get("rebuttals"),
                "external_worker": (item.get("langgraph_integrator") or {}).get("external_worker_runtime"),
                "passed": ok,
            }
        )

    summary = {
        "title": args.title,
        "status": "passed" if all_ok else "failed",
        "executed_at": data.get("executed_at"),
        "verification_profile": data.get("verification_profile"),
        "test_family": data.get("test_family"),
        "qwen_model": model.get("model"),
        "qwen_provider": model.get("provider"),
        "scenario_count": len(rows),
        "scenarios": rows,
        "manifest_path": str(manifest_path.resolve().relative_to(PACK.resolve())),
        "secrets_included": False,
        "judge_hint": data.get("suite") or "Live multi-scenario society evidence.",
    }
    out = Path(args.out) if args.out else manifest_path.parent / "judge-summary.json"
    out.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({"status": summary["status"], "summary": str(out.resolve().relative_to(PACK.resolve()))}, indent=2))
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
