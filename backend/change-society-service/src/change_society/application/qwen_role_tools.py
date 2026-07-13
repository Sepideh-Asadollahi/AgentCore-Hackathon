from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Callable


_EVIDENCE_LINE = re.compile(r"^\[(?P<id>[^\]]+)\]\s+(?P<title>[^:]+):\s*(?P<body>.+)$", re.MULTILINE)


def parse_evidence_catalog(user_prompt: str) -> dict[str, dict[str, str]]:
    block = user_prompt.split("EVIDENCE:", 1)[-1].split("PRIOR STRUCTURED FINDINGS:", 1)[0]
    catalog: dict[str, dict[str, str]] = {}
    for match in _EVIDENCE_LINE.finditer(block):
        catalog[match.group("id").strip()] = {
            "title": match.group("title").strip(),
            "content": match.group("body").strip(),
        }
    return catalog


def qwen_tool_definitions_for_role(role: str) -> list[dict[str, Any]]:
    """OpenAI-compatible tool specs passed to Qwen Cloud chat/completions."""
    if role == "context_scout":
        return [
            {
                "type": "function",
                "function": {
                    "name": "fetch_evidence_by_id",
                    "description": "Fetch one evidence item already supplied in the run context by evidence_id.",
                    "parameters": {
                        "type": "object",
                        "properties": {"evidence_id": {"type": "string"}},
                        "required": ["evidence_id"],
                    },
                },
            },
        ]
    if role == "policy_guardian":
        return [
            {
                "type": "function",
                "function": {
                    "name": "validate_policy_tags",
                    "description": "Check policy tags against the scenario required policy set.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "tags": {"type": "array", "items": {"type": "string"}},
                            "scenario_required_policies": {"type": "array", "items": {"type": "string"}},
                        },
                        "required": ["tags"],
                    },
                },
            },
        ]
    if role == "impact_analyst":
        return [
            {
                "type": "function",
                "function": {
                    "name": "rank_impact_keywords",
                    "description": "Rank supplied impact keywords against evidence text (deterministic heuristic).",
                    "parameters": {
                        "type": "object",
                        "properties": {"keywords": {"type": "array", "items": {"type": "string"}}},
                        "required": ["keywords"],
                    },
                },
            },
        ]
    return []


@dataclass(frozen=True)
class ToolInvocationResult:
    name: str
    output: dict[str, Any]


class RoleToolExecutor:
    """Executes role-scoped tools locally (MCP-shaped); results are fed back into Qwen tool messages."""

    def __init__(self, mcp_gateway: Callable[[str, dict[str, Any]], dict[str, Any]] | None = None):
        self._mcp_gateway = mcp_gateway

    def invoke(self, role: str, name: str, arguments: dict[str, Any], user_prompt: str) -> ToolInvocationResult:
        if self._mcp_gateway is not None:
            return ToolInvocationResult(name, self._mcp_gateway(name, arguments))
        catalog = parse_evidence_catalog(user_prompt)
        if name == "fetch_evidence_by_id":
            evidence_id = str(arguments.get("evidence_id", "")).strip()
            item = catalog.get(evidence_id)
            if not item:
                return ToolInvocationResult(name, {"found": False, "evidence_id": evidence_id})
            return ToolInvocationResult(name, {"found": True, "evidence_id": evidence_id, **item})
        if name == "validate_policy_tags":
            tags = [str(t) for t in arguments.get("tags", [])]
            required = [str(t) for t in arguments.get("scenario_required_policies", [])]
            if not required:
                required = ["revenue-impacting-change", "security-sensitive-change"]
            matched = sorted(set(tags).intersection(required))
            missing = sorted(set(required) - set(tags))
            return ToolInvocationResult(name, {"matched": matched, "missing_on_submission": missing, "submitted_tags": tags})
        if name == "rank_impact_keywords":
            keywords = [str(k).lower() for k in arguments.get("keywords", [])]
            corpus = " ".join(item["content"].lower() for item in catalog.values())
            ranked = sorted(keywords, key=lambda k: (corpus.count(k), k), reverse=True)
            return ToolInvocationResult(name, {"ranked_keywords": ranked, "corpus_evidence_count": len(catalog)})
        return ToolInvocationResult(name, {"error": "unknown_tool", "tool": name, "role": role})
