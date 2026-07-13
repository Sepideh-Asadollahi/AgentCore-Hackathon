from __future__ import annotations

from typing import Any


def build_judging_engineering_profile(*, model_health: dict[str, Any]) -> dict[str, Any]:
    """Machine-readable map from Devpost judging criteria to implemented code modules."""
    return {
        "source": "repository_code",
        "criteria": [
            {
                "id": "technical_depth_engineering",
                "title": "Technical Depth & Engineering",
                "weight_percent": 30,
                "implemented_in_code": [
                    {
                        "capability": "Qwen Cloud structured JSON + role headers",
                        "modules": ["infrastructure/qwen_client.py"],
                    },
                    {
                        "capability": "Qwen function-calling tool loop (role skills)",
                        "modules": ["application/qwen_role_tools.py", "infrastructure/qwen_client.py"],
                    },
                    {
                        "capability": "MCP-shaped external tool gateway",
                        "modules": ["infrastructure/mcp_tool_gateway.py"],
                    },
                    {
                        "capability": "Per-run token budget + bounded retries",
                        "modules": ["application/run_token_budget.py", "infrastructure/qwen_client.py"],
                    },
                    {
                        "capability": "Specialist conflict + negotiation policies",
                        "modules": ["domain/policies.py", "application/service.py"],
                    },
                    {
                        "capability": "Evidence retrieval with token budget ranking",
                        "modules": ["infrastructure/evidence_catalog.py"],
                    },
                ],
            },
            {
                "id": "innovation_ai_creativity",
                "title": "Innovation & AI Creativity",
                "weight_percent": 30,
                "implemented_in_code": [
                    {
                        "capability": "Ports-and-adapters modular monolith",
                        "modules": ["application/", "domain/", "infrastructure/", "bootstrap/container.py"],
                    },
                    {
                        "capability": "Universal Agent JSON v1 + typed schemas",
                        "modules": ["contracts/messages.py", "contracts/agent_adapter.py"],
                    },
                    {
                        "capability": "Agent control plane (registry, router, ticket FSM)",
                        "modules": ["application/control_plane.py", "domain/control_plane.py"],
                    },
                    {
                        "capability": "LangChain/LangGraph external bridge (SDK)",
                        "modules": ["hackathon/sdk/python/agentcore_agent_sdk/runtimes.py"],
                    },
                    {
                        "capability": "Typed errors + idempotency + optimistic versioning",
                        "modules": ["domain/models.py", "interfaces/api.py", "infrastructure/repositories.py"],
                    },
                ],
            },
            {
                "id": "problem_value_impact",
                "title": "Problem Value & Impact",
                "weight_percent": 25,
                "implemented_in_code": [
                    {
                        "capability": "Software change governance (revenue/security scenarios)",
                        "modules": ["infrastructure/evidence_catalog.py", "application/service.py"],
                    },
                    {
                        "capability": "Single-agent vs society evaluation metrics",
                        "modules": ["application/evaluation.py"],
                    },
                    {
                        "capability": "Cross-session memory on approved decisions",
                        "modules": ["application/service.py", "infrastructure/evidence_catalog.py"],
                    },
                    {
                        "capability": "Webhook adapter for productized external agents",
                        "modules": ["infrastructure/agent_adapters.py"],
                    },
                ],
            },
            {
                "id": "presentation_documentation",
                "title": "Presentation & Documentation",
                "weight_percent": 15,
                "implemented_in_code": [
                    {
                        "capability": "OpenAPI + stable operation ids",
                        "modules": ["interfaces/api.py"],
                    },
                    {
                        "capability": "Demo UI cinematic + inspector (protocol visualization)",
                        "modules": ["hackathon/frontend/app/CinematicDemo.tsx", "hackathon/frontend/lib/api.ts"],
                    },
                    {
                        "capability": "Architecture + compliance HTTP surfaces for reviewers",
                        "modules": ["hackathon/docs/02-architecture.md", "application/submission_compliance.py"],
                    },
                ],
            },
        ],
        "runtime_model": model_health,
    }
