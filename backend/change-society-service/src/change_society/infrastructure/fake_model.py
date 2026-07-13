from __future__ import annotations

from typing import Any

from ..application.ports import ModelResult


def _scenario_from_prompt(user_prompt: str) -> str:
    markers = {
        "ev_hr_export_diff": "hr-compensation-export",
        "ev_gdpr_ticket": "gdpr-erasure-automation",
        "ev_offboard_change": "vendor-access-offboarding",
        "ev_api_diff": "checkout-api-refactor",
        "ev_auth_change": "password-migration",
        "ev_paypal_current": "payment-memory",
        "ev_diff_price": "pricing-refactor",
    }
    for marker, scenario_id in markers.items():
        if marker in user_prompt:
            return scenario_id
    return "pricing-refactor"


class DeterministicModelClient:
    """Public test seam. Never selected for production readiness."""

    def complete(self, role: str, system_prompt: str, user_prompt: str, output_schema: type[Any]) -> ModelResult:
        scenario = _scenario_from_prompt(user_prompt)
        profiles: dict[str, dict[str, Any]] = {
            "pricing-refactor": {
                "evidence_refs": ["ev_diff_price", "ev_policy_revenue", "ev_decision_price", "ev_tests_billing"],
                "impacts": ["customer price", "billing tests", "checkout behavior", "product finance"],
                "policies": ["revenue-impacting-change"],
                "tasks": ["add billing regression tests", "request product finance approval", "update pricing documentation"],
                "change_low": "This initially appears to be a low-risk refactor.",
                "change_high": "I revise my position: base_price evidence makes this high risk.",
                "judge_rejected": "The change is only a low-risk refactor.",
            },
            "password-migration": {
                "evidence_refs": ["ev_auth_change", "ev_auth_policy", "ev_legacy_users"],
                "impacts": ["legacy users", "dual hash verification", "security approval path"],
                "policies": ["security-sensitive-change"],
                "tasks": ["implement lazy migration", "test legacy login", "request security approval"],
                "change_low": "Argon2 rollout looks like a standard security upgrade.",
                "change_high": "Legacy SHA256 users need an explicit migration path before cutover.",
                "judge_rejected": "Migration risk is negligible.",
            },
            "payment-memory": {
                "evidence_refs": ["ev_paypal_current", "ev_retry_policy", "ev_duplicate_incident"],
                "impacts": ["duplicate charges", "idempotency key", "PayPal API v2"],
                "policies": ["revenue-impacting-change"],
                "tasks": ["add idempotent retry", "test duplicate prevention", "request product finance approval"],
                "change_low": "Timeout retry tuning should be low risk.",
                "change_high": "Missing idempotency keys can duplicate charges per incident evidence.",
                "judge_rejected": "Retries are safe without extra controls.",
            },
            "checkout-api-refactor": {
                "evidence_refs": ["ev_api_diff", "ev_openapi", "ev_policy_api", "ev_tests_mobile"],
                "impacts": ["mobile clients", "taxIncluded field", "breaking HTTP contract", "platform approval"],
                "policies": ["api-breaking-change"],
                "tasks": ["restore backward compatible field", "add contract regression test", "request platform approval"],
                "change_low": "Handler refactor is internal; response shape should stay compatible.",
                "change_high": "Removing taxIncluded breaks the documented OpenAPI contract for mobile v3.",
                "judge_rejected": "No client-visible API change occurred.",
            },
            "hr-compensation-export": {
                "evidence_refs": ["ev_hr_export_diff", "ev_hr_policy", "ev_privacy_policy", "ev_portal_mock"],
                "impacts": ["employee portal", "manager export", "PII masking", "HR Legal approval"],
                "policies": ["hr-sensitive-change", "privacy-sensitive-change"],
                "tasks": ["mask PII in export", "add HR Legal approval workflow", "update employee portal copy"],
                "change_low": "Manager CSV export is a productivity feature for review season.",
                "change_high": "Salary and national_id columns violate privacy policy without masking.",
                "judge_rejected": "Export is internal-only and low risk.",
            },
            "gdpr-erasure-automation": {
                "evidence_refs": ["ev_gdpr_ticket", "ev_retention_policy", "ev_gdpr_policy", "ev_analytics_incident"],
                "impacts": ["billing retention", "analytics warehouse", "GDPR queue", "Legal approval"],
                "policies": ["privacy-sensitive-change", "gdpr-erasure-required"],
                "tasks": ["implement retention exception matrix", "test partial erasure", "request Privacy Legal approval"],
                "change_low": "Automating erasure reduces manual privacy toil.",
                "change_high": "Hard delete conflicts with seven-year invoice retention policy.",
                "judge_rejected": "Full delete is required for GDPR regardless of finance.",
            },
            "vendor-access-offboarding": {
                "evidence_refs": ["ev_offboard_change", "ev_security_policy", "ev_hr_offboard_policy", "ev_vendor_incident"],
                "impacts": ["SSO groups", "vendor API keys", "HR termination", "Security verification"],
                "policies": ["security-sensitive-change", "hr-offboarding-required"],
                "tasks": ["revoke SSO within four hours", "run access audit", "request Security and HR sign-off"],
                "change_low": "HR termination can proceed; IT can revoke access next sprint.",
                "change_high": "Delayed SSO removal repeats prior vendor access incident.",
                "judge_rejected": "Access cleanup is operational follow-up, not change risk.",
            },
        }
        profile = profiles[scenario]
        common = {
            "summary": f"Deterministic {role} analysis ({scenario})",
            "findings": ["The change has evidence-backed downstream effects."],
            "impacts": profile["impacts"],
            "policies": profile["policies"],
            "tasks": profile["tasks"],
            "evidence_refs": profile["evidence_refs"],
            "assumptions": [],
            "unresolved_questions": [],
            "confidence": 0.91,
            "recommended_action": "Escalate for evidence-backed human approval.",
        }
        if role == "context_scout":
            remembered = ["memory_1"] if "[memory_1]" in user_prompt else []
            payload = {
                **common,
                "risk_level": "medium",
                "included_evidence": common["evidence_refs"] + remembered,
                "evidence_refs": common["evidence_refs"] + remembered,
                "excluded_evidence": [{"evidence_id": "ev_old_refactor", "reason": "not_current"}]
                if scenario == "pricing-refactor"
                else [],
            }
        elif role == "single_agent_baseline":
            payload = {
                **common,
                "risk_level": "medium",
                "impacts": profile["impacts"][:1],
                "policies": [],
                "tasks": profile["tasks"][:1],
                "evidence_refs": profile["evidence_refs"][:1],
            }
        elif role == "change_analyst" and "ONE BOUNDED REBUTTAL" not in user_prompt:
            payload = {**common, "risk_level": "low", "summary": profile["change_low"], "policies": []}
        elif role == "change_analyst":
            payload = {**common, "risk_level": "high", "summary": profile["change_high"]}
        elif role in {"coordinator_judge", "coordinator"}:
            payload = {
                "verdict": "accept_high_risk",
                "final_risk_level": "high",
                "rationale": f"Specialist conflict on {scenario} resolved using cited evidence.",
                "accepted_evidence_refs": profile["evidence_refs"][:2],
                "rejected_position": profile["judge_rejected"],
                "required_approvers": ["product", "finance"]
                if "revenue" in str(profile["policies"])
                else ["platform", "mobile"]
                if "api-breaking" in str(profile["policies"])
                else ["hr", "legal", "privacy"],
                "confidence": 0.96,
            }
        elif role == "frontend_delivery_lead":
            handoffs = {
                "checkout-api-refactor": {
                    "ui_changes": ["Restore taxIncluded in checkout summary UI if API returns it again."],
                    "ux_review_items": ["Mobile v3 checkout empty-state when taxIncluded missing."],
                    "api_client_updates": ["Update TypeScript client models for checkout response taxIncluded."],
                    "frontend_tasks": ["Add contract test against OpenAPI checkout response."],
                    "design_artifacts_needed": ["Figma diff for checkout totals row"],
                },
                "pricing-refactor": {
                    "ui_changes": ["Verify displayed pre-tax price matches base_price after refactor."],
                    "ux_review_items": ["Checkout price change messaging for finance approval path."],
                    "api_client_updates": [],
                    "frontend_tasks": ["Add UI regression for checkout totals"],
                    "design_artifacts_needed": ["Pricing copy review checklist"],
                },
                "password-migration": {
                    "ui_changes": ["Login error copy for legacy hash migration path."],
                    "ux_review_items": ["Password reset flow during Argon2 migration."],
                    "api_client_updates": [],
                    "frontend_tasks": ["E2E login for legacy users"],
                    "design_artifacts_needed": ["Auth flow storyboard update"],
                },
                "payment-memory": {
                    "ui_changes": ["Retry spinner must not duplicate charge confirmation."],
                    "ux_review_items": ["Duplicate charge incident messaging."],
                    "api_client_updates": ["Send idempotency key header on retry from web client."],
                    "frontend_tasks": ["Client retry integration test"],
                    "design_artifacts_needed": ["Payment error state mockups"],
                },
                "hr-compensation-export": {
                    "ui_changes": ["Mask national_id and salary columns in manager export UI."],
                    "ux_review_items": ["Manager export consent and audit trail in employee portal."],
                    "api_client_updates": ["Update portal client types for masked export fields."],
                    "frontend_tasks": ["Add portal regression for PII masking"],
                    "design_artifacts_needed": ["HR export flow wireframes"],
                },
                "gdpr-erasure-automation": {
                    "ui_changes": ["Privacy center status for partial vs completed erasure."],
                    "ux_review_items": ["Explain retention exceptions for invoices in UX copy."],
                    "api_client_updates": [],
                    "frontend_tasks": ["Surface erasure job state in admin UI"],
                    "design_artifacts_needed": ["GDPR request status screens"],
                },
                "vendor-access-offboarding": {
                    "ui_changes": ["Admin SSO group revocation checklist tied to HR termination."],
                    "ux_review_items": ["Vendor offboarding timeline vs four-hour security rule."],
                    "api_client_updates": [],
                    "frontend_tasks": ["E2E offboarding dashboard state"],
                    "design_artifacts_needed": ["Offboarding operator console mockups"],
                },
            }
            items = handoffs.get(scenario, handoffs["checkout-api-refactor"])
            payload = {
                "summary": f"Frontend team must implement UI/UX/API client updates for {scenario}.",
                "team_queue": "frontend",
                "priority": "high",
                "evidence_refs": profile["evidence_refs"][:3],
                "confidence": 0.9,
                "recommended_action": "Open frontend team queue items before release.",
                **items,
            }
        else:
            payload = {**common, "risk_level": "high"}
        validated = output_schema.model_validate(payload)
        return ModelResult(validated.model_dump(), 120, 80, 25, "deterministic-test-model")

    def health(self) -> dict[str, Any]:
        return {"provider": "deterministic_fake", "configured": True, "production_ready": False}
