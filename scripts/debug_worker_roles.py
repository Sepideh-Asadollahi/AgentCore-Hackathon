#!/usr/bin/env python3
import hashlib
import hmac
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [
    str(ROOT / "hackathon/examples/external-change-analyst-worker/src"),
    str(ROOT / "hackathon/backend/change-society-service/src"),
    str(ROOT / "hackathon/sdk/python"),
]
env = ROOT / "hackathon/.env"
if env.is_file():
    for line in env.read_text().splitlines():
        if line.strip() and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

os.environ.setdefault("AGENTCORE_WEBHOOK_SHARED_SECRET", "integrator-demo-secret-change-me")
os.environ["WORKER_LIVE_MODE"] = "1"

from fastapi.testclient import TestClient
from worker.main import create_app
from worker.settings import Settings

client = TestClient(create_app(Settings.load()))
for role, title in [
    ("context_scout", "ContextOutput"),
    ("policy_guardian", "RoleOutput"),
    ("coordinator_judge", "JudgeOutput"),
]:
    body = {
        "contract_version": "1.0",
        "ticket_id": f"t_{role}",
        "agent_id": "a",
        "role": role,
        "system_prompt": f"Return {title} JSON",
        "user_prompt": "REQUEST: checkout refactor\nEVIDENCE:\n[ev_api_diff] taxIncluded",
        "output_schema": {"title": title, "type": "object"},
        "correlation_id": "c",
    }
    enc = json.dumps(body, sort_keys=True, separators=(",", ":")).encode()
    sig = hmac.new(os.environ["AGENTCORE_WEBHOOK_SHARED_SECRET"].encode(), enc, hashlib.sha256).hexdigest()
    r = client.post(
        "/api/v1/agent-tickets:execute",
        content=enc,
        headers={"X-AgentCore-Signature": sig, "Content-Type": "application/json"},
    )
    print(role, r.status_code, r.text[:200])
