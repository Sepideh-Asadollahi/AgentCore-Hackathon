from __future__ import annotations

from hashlib import sha256
import json
from typing import Any

from .models import AgentMessage, ConflictRecord, RiskLevel, RISK_ORDER


def stable_digest(value: Any) -> str:
    return sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), default=str).encode()).hexdigest()


def detect_risk_conflict(change: AgentMessage, policy: AgentMessage, conflict_id: str) -> ConflictRecord | None:
    if change.risk_level == policy.risk_level:
        return None
    if abs(RISK_ORDER[change.risk_level] - RISK_ORDER[policy.risk_level]) < 2:
        return None
    return _conflict_record(
        conflict_id,
        "risk_level",
        change,
        policy,
    )


def detect_specialist_conflict(
    change: AgentMessage,
    policy: AgentMessage,
    conflict_id: str,
    required_policies: tuple[str, ...] = (),
) -> ConflictRecord | None:
    """Detect negotiation triggers for both deterministic tests and live Qwen runs."""
    material = detect_risk_conflict(change, policy, conflict_id)
    if material:
        return material
    policy_tags = set(policy.payload.get("policies", []))
    required = set(required_policies)
    if not required.intersection(policy_tags):
        return None
    gap = RISK_ORDER[policy.risk_level] - RISK_ORDER[change.risk_level]
    if gap >= 1:
        return _conflict_record(conflict_id, "required_policy_risk_gap", change, policy)
    if gap == 0 and _recommended_actions_disagree(
        str(change.payload.get("recommended_action", "")),
        str(policy.payload.get("recommended_action", "")),
    ):
        return _conflict_record(conflict_id, "recommended_action", change, policy)
    missing_on_change = required - set(change.payload.get("policies", []))
    if required.intersection(policy_tags) and missing_on_change:
        return _conflict_record(conflict_id, "policy_tag_asymmetry", change, policy)
    return None


def detect_scenario_negotiation_gate(
    change: AgentMessage,
    policy: AgentMessage,
    conflict_id: str,
    required_policies: tuple[str, ...],
    requires_negotiation: bool,
) -> ConflictRecord | None:
    if not requires_negotiation or not required_policies:
        return None
    if not _required_policies_reflected(policy, required_policies):
        return None
    return _conflict_record(conflict_id, "scenario_negotiation_gate", change, policy)


def _required_policies_reflected(policy: AgentMessage, required_policies: tuple[str, ...]) -> bool:
    policy_tags = set(policy.payload.get("policies", []))
    corpus = " ".join(
        [
            *policy_tags,
            *policy.payload.get("findings", []),
            str(policy.payload.get("summary", "")),
            str(policy.payload.get("recommended_action", "")),
        ]
    ).lower()
    for required in required_policies:
        if required in policy_tags:
            return True
        normalized = required.replace("-", " ").lower()
        if normalized in corpus or required.split("-")[0] in corpus:
            return True
    return False


def _conflict_record(conflict_id: str, topic: str, change: AgentMessage, policy: AgentMessage) -> ConflictRecord:
    return ConflictRecord(
        conflict_id=conflict_id,
        topic=topic,
        claim_a_message_id=change.message_id,
        claim_b_message_id=policy.message_id,
        claim_a_risk=change.risk_level,
        claim_b_risk=policy.risk_level,
        evidence_refs=sorted(set(change.evidence_refs + policy.evidence_refs)),
        status="open",
    )


def _recommended_actions_disagree(change_action: str, policy_action: str) -> bool:
    change_text = change_action.lower()
    policy_text = policy_action.lower()
    change_permissive = any(token in change_text for token in ("proceed", "merge", "ship", "low risk", "safe refactor"))
    policy_restrictive = any(token in policy_text for token in ("escalate", "approval", "human", "block", "hold", "finance", "product"))
    policy_permissive = any(token in policy_text for token in ("proceed", "merge", "ship", "low risk"))
    change_restrictive = any(token in change_text for token in ("escalate", "approval", "human", "block", "hold"))
    return (change_permissive and policy_restrictive) or (policy_permissive and change_restrictive)


def requires_human_approval(risk: RiskLevel, unresolved: bool, policy_matches: list[str]) -> bool:
    protected = {
        "revenue-impacting-change",
        "security-sensitive-change",
        "privacy-sensitive-change",
        "production-change",
        "hr-sensitive-change",
        "gdpr-erasure-required",
        "hr-offboarding-required",
        "api-breaking-change",
    }
    return unresolved or RISK_ORDER[risk] >= RISK_ORDER[RiskLevel.HIGH] or bool(protected.intersection(policy_matches))
