from __future__ import annotations

from dataclasses import dataclass
from typing import Any


# ponytail: keyword heuristic — upgrade path: LLM structured extraction via llm_gateway
POLICY_CATALOG: dict[str, dict[str, Any]] = {
    "revenue-impacting-change": {
        "title": "Revenue and billing governance",
        "policy_text": (
            "Any change affecting customer billing, pricing, discounts, refunds, invoices, or checkout totals "
            "requires Product and Finance approval before merge."
        ),
        "keywords": ("billing", "price", "pricing", "revenue", "invoice", "checkout", "payment", "refund", "tax"),
    },
    "security-sensitive-change": {
        "title": "Security-sensitive change control",
        "policy_text": (
            "Authentication, cryptography, SSO, API keys, or access-control changes require Security approval "
            "and a tested rollback or migration path."
        ),
        "keywords": ("security", "auth", "password", "sso", "api key", "access", "crypt", "argon", "hash"),
    },
    "privacy-sensitive-change": {
        "title": "Privacy and PII handling",
        "policy_text": (
            "Exports or processing of personal data (PII) require Privacy review and documented lawful basis "
            "before automation."
        ),
        "keywords": ("privacy", "pii", "personal data", "gdpr", "national_id", "compensation export"),
    },
    "gdpr-erasure-required": {
        "title": "GDPR erasure with retention",
        "policy_text": (
            "Automated erasure must respect finance and legal retention windows; partial erasure plans "
            "require Privacy and Legal approval."
        ),
        "keywords": ("erasure", "delete user", "gdpr", "retention", "right to be forgotten"),
    },
    "hr-sensitive-change": {
        "title": "HR-sensitive operations",
        "policy_text": "HR compensation, payroll, or workforce data changes require HR and Privacy sign-off.",
        "keywords": ("hr", "payroll", "compensation", "workforce", "employee data"),
    },
    "hr-offboarding-required": {
        "title": "HR offboarding orchestration",
        "policy_text": (
            "Terminated identities must lose SSO and vendor access within the same governed change window as HR offboarding."
        ),
        "keywords": ("offboard", "termination", "vendor", "contractor", "sso"),
    },
    "api-breaking-change": {
        "title": "HTTP API contract stability",
        "policy_text": (
            "Breaking HTTP or mobile client contract changes require Platform and Mobile approval and contract regression tests."
        ),
        "keywords": ("api", "breaking", "contract", "mobile", "openapi", "taxincluded", "response field"),
    },
    "production-change": {
        "title": "Production deployment gate",
        "policy_text": "Production routing, feature flags, or customer-visible behavior changes require on-call lead approval.",
        "keywords": ("production", "prod", "deploy", "routing", "customer-visible", "on-call"),
    },
}


def _normalize(text: str) -> str:
    return text.lower().replace("_", " ")


def _narrative_mentions(text: str, keywords: tuple[str, ...]) -> bool:
    blob = _normalize(text)
    return any(word in blob for word in keywords)


def infer_policy_tags(narrative: str, constraints: str = "") -> list[str]:
    combined = f"{narrative}\n{constraints}"
    tags: list[str] = []
    for tag, meta in POLICY_CATALOG.items():
        if _narrative_mentions(combined, tuple(meta["keywords"])):
            tags.append(tag)
    return tags


def build_requirements_digest(narrative: str, constraints: str, inferred_tags: list[str]) -> list[str]:
    digest = [
        "Organization described an explicit operating process (guided intake).",
        "Policies must be retrieved as evidence for Policy Guardian during society runs.",
    ]
    if constraints.strip():
        digest.append(f"Stated constraints: {constraints.strip()[:500]}")
    if inferred_tags:
        digest.append(f"Inferred governance tags from narrative: {', '.join(inferred_tags)}")
    else:
        digest.append("No known policy tags matched keywords; review candidates manually or refine narrative.")
    return digest


def build_candidate_policies(
    narrative: str,
    constraints: str,
    scenario_required: tuple[str, ...],
) -> list[dict[str, Any]]:
    inferred = infer_policy_tags(narrative, constraints)
    tags = list(dict.fromkeys([*inferred, *scenario_required]))
    candidates: list[dict[str, Any]] = []
    for tag in tags:
        meta = POLICY_CATALOG.get(tag)
        if not meta:
            continue
        custom_line = ""
        if _narrative_mentions(narrative, tuple(meta["keywords"])):
            custom_line = f" Organization narrative reinforces: {_normalize(narrative)[:240]}..."
        candidates.append(
            {
                "candidate_id": f"cand_{tag}",
                "policy_tag": tag,
                "title": meta["title"],
                "policy_text": meta["policy_text"] + custom_line,
                "source": "inferred" if tag in inferred else "scenario_benchmark",
                "risk": "medium" if tag in {"production-change", "gdpr-erasure-required"} else "low",
                "confidence": 0.85 if tag in inferred else 0.65,
            }
        )
    return candidates


def build_challenges(
    narrative: str,
    scenario_id: str,
    scenario_required: tuple[str, ...],
    candidates: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    challenges: list[dict[str, Any]] = []
    blob = _normalize(narrative)
    org_wide = "organization" in blob or "org wide" in blob or "company wide" in blob
    project_only = "this project" in blob or "project only" in blob
    if not org_wide and not project_only:
        challenges.append(
            {
                "challenge_id": "challenge_scope",
                "sequence": 1,
                "type": "scope",
                "title": "Policy scope",
                "summary": "Should these organization policies apply to this project only or the whole workspace?",
                "linked_candidate_ids": [c["candidate_id"] for c in candidates],
                "options": [
                    {
                        "option_id": "scope_project",
                        "label": "This project only (recommended for demo)",
                        "outcome": "Policies attach to the current project scope.",
                    },
                    {
                        "option_id": "scope_workspace",
                        "label": "Entire workspace",
                        "outcome": "Policies apply to all projects in the workspace (demo stores per project; same evidence model).",
                    },
                ],
                "default_recommendation": "scope_project",
                "resolved": False,
                "resolution": None,
            }
        )
    overlap_tags = [tag for tag in scenario_required if any(c["policy_tag"] == tag and c["source"] == "inferred" for c in candidates)]
    seq = 2
    for tag in overlap_tags:
        challenges.append(
            {
                "challenge_id": f"challenge_overlap_{tag}",
                "sequence": seq,
                "type": "tradeoff",
                "title": f"Supplement catalog policy for {tag}?",
                "summary": (
                    f"Scenario `{scenario_id}` already ships benchmark policy evidence for `{tag}`. "
                    "Add your organization wording as additional retrieved policy evidence?"
                ),
                "linked_candidate_ids": [f"cand_{tag}"],
                "options": [
                    {
                        "option_id": "adopt_org_wording",
                        "label": "Yes — add org policy evidence (recommended)",
                        "outcome": "Policy Guardian can cite org-specific evidence IDs during runs.",
                    },
                    {
                        "option_id": "catalog_only",
                        "label": "No — rely on built-in scenario catalog only",
                        "outcome": "Skip activating org policy for this tag.",
                    },
                ],
                "default_recommendation": "adopt_org_wording",
                "resolved": False,
                "resolution": None,
            }
        )
        seq += 1
    return challenges


@dataclass
class IntakeAnalysis:
    requirements_digest: list[str]
    candidate_policies: list[dict[str, Any]]
    challenges: list[dict[str, Any]]
    coverage_map: dict[str, Any]

    def as_dict(self, session_id: str, scenario_id: str) -> dict[str, Any]:
        return {
            "intake_session_id": session_id,
            "scenario_id": scenario_id,
            "state": "challenges_pending" if self.challenges else "rules_pending_approval",
            "requirements_digest": self.requirements_digest,
            "coverage_map": self.coverage_map,
            "candidate_policies": self.candidate_policies,
            "challenges": self.challenges,
        }


def analyze_intake(
    session_id: str,
    scenario_id: str,
    narrative: str,
    constraints: str,
    scenario_required: tuple[str, ...],
    existing_org_tags: set[str],
) -> IntakeAnalysis:
    inferred = infer_policy_tags(narrative, constraints)
    candidates = build_candidate_policies(narrative, constraints, scenario_required)
    challenges = build_challenges(narrative, scenario_id, scenario_required, candidates)
    digest = build_requirements_digest(narrative, constraints, inferred)
    coverage = {
        "scenario_required_policies": list(scenario_required),
        "inferred_from_narrative": inferred,
        "already_active_org_tags": sorted(existing_org_tags),
        "gaps": [tag for tag in scenario_required if tag not in existing_org_tags],
    }
    return IntakeAnalysis(digest, candidates, challenges, coverage)


def candidates_to_activate(
    session: dict[str, Any],
    adopted_candidate_ids: list[str],
) -> list[dict[str, Any]]:
    challenges = session.get("challenges") or []
    skipped: set[str] = set()
    for challenge in challenges:
        resolution = (challenge.get("resolution") or {}).get("option_id")
        if resolution == "catalog_only":
            skipped.update(challenge.get("linked_candidate_ids") or [])
    selected = set(adopted_candidate_ids) - skipped
    by_id = {c["candidate_id"]: c for c in session.get("candidate_policies") or []}
    return [by_id[cid] for cid in selected if cid in by_id]
