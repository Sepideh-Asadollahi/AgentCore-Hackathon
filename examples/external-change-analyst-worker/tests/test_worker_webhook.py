import hashlib
import hmac
import json
import os
import sys

import pytest
from fastapi.testclient import TestClient

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "hackathon", "examples", "external-change-analyst-worker", "src"))
sys.path.insert(0, os.path.join(ROOT, "hackathon", "sdk", "python"))

os.environ.setdefault("AGENTCORE_WEBHOOK_SHARED_SECRET", "integrator-demo-secret-change-me")

from worker.main import create_app  # noqa: E402
from worker.settings import Settings  # noqa: E402


@pytest.fixture
def client():
    settings = Settings.load()
    return TestClient(create_app(settings))


def _signed(body: dict) -> tuple[bytes, str]:
    encoded = json.dumps(body, sort_keys=True, separators=(",", ":")).encode()
    sig = hmac.new(b"integrator-demo-secret-change-me", encoded, hashlib.sha256).hexdigest()
    return encoded, sig


def test_ready(client):
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_execute_change_analyst_contract(client):
    body = {
        "contract_version": "1.0",
        "ticket_id": "ticket_demo",
        "agent_id": "agent_demo",
        "role": "change_analyst",
        "system_prompt": "Return JSON RoleOutput",
        "user_prompt": "REQUEST:\nRefactor checkout\nEVIDENCE:\n[ev_api_diff] removed taxIncluded\n[ev_openapi] taxIncluded required",
        "output_schema": {"title": "RoleOutput", "type": "object"},
        "correlation_id": "corr_demo",
    }
    payload, signature = _signed(body)
    response = client.post(
        "/api/v1/agent-tickets:execute",
        content=payload,
        headers={"Content-Type": "application/json", "X-AgentCore-Signature": signature},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["contract_version"] == "1.0"
    assert data["output"]["risk_level"] in {"low", "medium", "high", "critical"}
    assert "summary" in data["output"]
    assert data.get("runtime") == "langgraph-change-analyst"


def test_execute_rebuttal_raises_risk(client):
    body = {
        "contract_version": "1.0",
        "ticket_id": "ticket_rebuttal",
        "agent_id": "agent_demo",
        "role": "change_analyst",
        "system_prompt": "Return JSON RoleOutput",
        "user_prompt": (
            "ONE BOUNDED REBUTTAL\n"
            "EVIDENCE:\n[ev_api_diff] removed taxIncluded\n[ev_openapi] taxIncluded required"
        ),
        "output_schema": {"title": "RoleOutput", "type": "object"},
        "correlation_id": "corr_rebuttal",
    }
    payload, signature = _signed(body)
    response = client.post(
        "/api/v1/agent-tickets:execute",
        content=payload,
        headers={"Content-Type": "application/json", "X-AgentCore-Signature": signature},
    )
    assert response.status_code == 200
    assert response.json()["output"]["risk_level"] == "high"
    assert "taxIncluded" in response.json()["output"]["summary"]
