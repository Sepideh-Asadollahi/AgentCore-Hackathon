from __future__ import annotations

from collections import defaultdict
from threading import RLock

from ..application.org_policy_intake import analyze_intake, candidates_to_activate
from ..application.ports import Scenario
from ..domain.models import Evidence, NotFoundError, Scope, ValidationError


SCENARIOS = (
    Scenario(
        "pricing-refactor",
        "Hidden revenue risk in a tax refactor",
        "Refactor checkout tax calculation for readability without changing customer-visible behavior.",
        (
            Evidence("ev_diff_price", "change", "Representative diff", "calculate_taxed_price now changes base_price before tax is applied.", tags=("pricing", "checkout", "base_price")),
            Evidence("ev_policy_revenue", "policy", "Revenue approval policy", "Any change affecting customer billing, price, discounts, refunds, or invoices requires Product and Finance approval.", tags=("revenue", "approval")),
            Evidence("ev_decision_price", "decision", "Current pricing decision", "base_price is the authoritative pre-tax customer price and must remain stable during refactors.", tags=("pricing", "current")),
            Evidence("ev_tests_billing", "test", "Billing contract tests", "Billing contract tests assert totals but currently do not cover the new intermediate base_price mutation.", tags=("tests", "billing")),
            Evidence("ev_old_refactor", "memory", "Old refactor note", "Tax refactors are always low risk.", status="deprecated", tags=("stale",)),
            Evidence("ev_secret", "memory", "Restricted production note", "token=never-send-to-model", restricted=True, tags=("restricted",)),
        ),
        ("customer price", "billing tests", "checkout behavior", "product finance"),
        ("revenue-impacting-change",),
        ("add billing regression tests", "request product finance approval", "update pricing documentation"),
        True,
        "revenue_and_billing",
        (
            "Revenue-impacting changes require Product and Finance approval.",
            "Restricted payroll or billing memory must never enter model context.",
            "Human approval gate before merge on high revenue risk.",
        ),
        ("multi_agent_orchestration", "negotiation_and_rebuttal", "human_approval_gate", "frontend_handoff", "baseline_evaluation"),
    ),
    Scenario(
        "password-migration",
        "Password hashing migration compatibility",
        "Replace SHA256 password hashing with Argon2 and safely migrate existing users.",
        (
            Evidence("ev_auth_change", "change", "Authentication change", "New password hashes use Argon2 while existing accounts contain SHA256 hashes.", tags=("security", "auth")),
            Evidence("ev_auth_policy", "policy", "Authentication policy", "Authentication algorithm changes require Security approval and a tested legacy migration path.", tags=("security", "approval")),
            Evidence("ev_legacy_users", "incident", "Legacy compatibility", "Removing SHA256 verification before lazy migration locks out legacy users.", tags=("migration", "users")),
        ),
        ("legacy users", "dual hash", "security approval"),
        ("security-sensitive-change",),
        ("implement lazy migration", "test legacy login", "request security approval"),
        False,
        "security_and_identity",
        (
            "Authentication algorithm changes require Security approval.",
            "Legacy user migration must be explicit before cutover.",
        ),
        ("multi_agent_orchestration", "policy_tag_rules", "human_approval_gate", "frontend_handoff", "cross_session_memory"),
    ),
    Scenario(
        "payment-memory",
        "Current payment truth versus stale memory",
        "Fix timeout retries in the current payment checkout integration without duplicate charges.",
        (
            Evidence("ev_paypal_current", "decision", "Current gateway", "PayPal API v2 is the current payment gateway.", tags=("payments", "current")),
            Evidence("ev_retry_policy", "policy", "Payment retry policy", "Payment retries require idempotency keys and revenue-risk approval.", tags=("payments", "revenue")),
            Evidence("ev_duplicate_incident", "incident", "Duplicate charge incident", "A prior timeout retry caused duplicate charges when the idempotency key was omitted.", tags=("incident", "critical")),
            Evidence("ev_stripe_old", "memory", "Previous gateway", "Stripe is the current gateway.", status="deprecated", tags=("payments", "stale")),
        ),
        ("duplicate charges", "idempotency key", "PayPal API v2"),
        ("revenue-impacting-change",),
        ("add idempotent retry", "test duplicate prevention", "request product finance approval"),
        False,
        "payments_and_reliability",
        (
            "Stale memory evidence must be excluded from context.",
            "Payment retries require idempotency keys and revenue approval.",
        ),
        ("multi_agent_orchestration", "context_freshness_rules", "human_approval_gate", "frontend_handoff"),
    ),
    Scenario(
        "checkout-api-refactor",
        "Silent HTTP contract break during handler refactor",
        "Refactor checkout HTTP handler to delegate pricing to an internal service without changing documented API behavior.",
        (
            Evidence(
                "ev_api_diff",
                "change",
                "Handler diff",
                "Response JSON no longer includes taxIncluded; mobile clients still deserialize it as required.",
                tags=("api", "contract", "breaking", "code"),
            ),
            Evidence(
                "ev_openapi",
                "decision",
                "OpenAPI contract",
                "Checkout response schema requires taxIncluded boolean for mobile clients v3.",
                tags=("api", "contract", "openapi"),
            ),
            Evidence(
                "ev_policy_api",
                "policy",
                "API change policy",
                "Breaking HTTP contract changes require Platform and Mobile approval before merge.",
                tags=("api", "approval", "platform"),
            ),
            Evidence(
                "ev_tests_mobile",
                "test",
                "Mobile contract tests",
                "Android smoke tests assert taxIncluded; backend-only CI skips those suites on handler refactors.",
                tags=("tests", "mobile", "ci"),
            ),
        ),
        ("mobile clients", "taxIncluded", "breaking change", "platform approval"),
        ("api-breaking-change",),
        ("restore backward compatible field", "add contract regression test", "request platform approval"),
        True,
        "software_engineering_api",
        (
            "Breaking HTTP contracts require Platform and Mobile approval.",
            "Backend-only CI must not skip mobile contract suites.",
        ),
        ("multi_agent_orchestration", "negotiation_and_rebuttal", "frontend_handoff", "human_approval_gate"),
    ),
    Scenario(
        "hr-compensation-export",
        "HR payroll export with hidden PII columns",
        "Add a one-click CSV export for managers to review compensation bands before annual reviews.",
        (
            Evidence(
                "ev_hr_export_diff",
                "change",
                "Export feature diff",
                "New manager export includes salary, bonus, and national_id columns in the CSV download.",
                tags=("hr", "payroll", "pii", "export"),
            ),
            Evidence(
                "ev_hr_policy",
                "policy",
                "HR data policy",
                "Exports containing compensation or government identifiers require HR and Legal approval before release.",
                tags=("hr", "approval", "legal"),
            ),
            Evidence(
                "ev_privacy_policy",
                "policy",
                "Privacy policy",
                "Employee PII may not be exposed to managers without role-based masking and audit logging.",
                tags=("privacy", "pii", "audit"),
            ),
            Evidence(
                "ev_portal_mock",
                "test",
                "Employee portal tests",
                "Portal UI tests cover profile view but not manager export masking rules.",
                tags=("portal", "ui", "tests"),
            ),
            Evidence(
                "ev_old_hr_note",
                "memory",
                "Stale HR note",
                "Manager exports are always low risk.",
                status="deprecated",
                tags=("stale", "hr"),
            ),
        ),
        ("employee portal", "manager export", "PII masking", "HR Legal approval"),
        ("hr-sensitive-change", "privacy-sensitive-change"),
        ("mask PII in export", "add HR Legal approval workflow", "update employee portal copy"),
        True,
        "human_resources",
        (
            "HR and Legal must approve compensation or identifier exports.",
            "PII masking and audit logging are mandatory for manager-facing data.",
            "Restricted HR memory must not bypass context boundaries.",
        ),
        ("multi_agent_orchestration", "negotiation_and_rebuttal", "governance_rules", "frontend_handoff", "human_approval_gate"),
    ),
    Scenario(
        "gdpr-erasure-automation",
        "Automated GDPR erasure versus billing retention",
        "Automate user erasure jobs when a GDPR ticket closes, including downstream analytics cleanup.",
        (
            Evidence(
                "ev_gdpr_ticket",
                "change",
                "Erasure automation",
                "New job deletes user profile, orders, and analytics events immediately when GDPR ticket status becomes closed.",
                tags=("gdpr", "erasure", "privacy"),
            ),
            Evidence(
                "ev_retention_policy",
                "policy",
                "Finance retention policy",
                "Invoices and tax records must be retained for seven years and cannot be hard-deleted with profile erasure.",
                tags=("retention", "finance", "legal"),
            ),
            Evidence(
                "ev_gdpr_policy",
                "policy",
                "GDPR policy",
                "Erasure automation requires Privacy and Legal approval with a documented retention exception matrix.",
                tags=("gdpr", "privacy", "approval"),
            ),
            Evidence(
                "ev_analytics_incident",
                "incident",
                "Analytics deletion gap",
                "A prior manual erasure left events in the warehouse because batch jobs ignored the GDPR queue.",
                tags=("analytics", "incident"),
            ),
        ),
        ("billing retention", "analytics warehouse", "GDPR queue", "Legal approval"),
        ("privacy-sensitive-change", "gdpr-erasure-required"),
        ("implement retention exception matrix", "test partial erasure", "request Privacy Legal approval"),
        True,
        "privacy_and_compliance",
        (
            "GDPR erasure must respect finance retention windows.",
            "Privacy and Legal approval required for automated deletion pipelines.",
        ),
        ("multi_agent_orchestration", "negotiation_and_rebuttal", "conflicting_policies", "human_approval_gate"),
    ),
    Scenario(
        "vendor-access-offboarding",
        "Vendor offboarding versus lingering SSO access",
        "Offboard a terminated vendor contractor and revoke all SSO groups within the same change window.",
        (
            Evidence(
                "ev_offboard_change",
                "change",
                "Offboarding change",
                "HR marks contractor terminated but SSO group removal is scheduled as a separate manual ticket next week.",
                tags=("hr", "offboarding", "sso"),
            ),
            Evidence(
                "ev_security_policy",
                "policy",
                "Access termination policy",
                "Terminated identities must lose SSO and API keys within four hours.",
                tags=("security", "sso", "termination"),
            ),
            Evidence(
                "ev_hr_offboard_policy",
                "policy",
                "HR offboarding policy",
                "HR offboarding requires Security verification before payroll finalization.",
                tags=("hr", "offboarding", "approval"),
            ),
            Evidence(
                "ev_vendor_incident",
                "incident",
                "Lingering vendor access",
                "A prior contractor retained VPN access for three days after HR termination.",
                tags=("incident", "vendor", "critical"),
            ),
        ),
        ("SSO groups", "vendor API keys", "HR termination", "Security verification"),
        ("security-sensitive-change", "hr-offboarding-required"),
        ("revoke SSO within four hours", "run access audit", "request Security and HR sign-off"),
        False,
        "human_resources_and_security",
        (
            "HR offboarding and Security access revocation must be orchestrated in one governed change.",
            "Terminated identities cannot retain SSO beyond four hours.",
        ),
        ("multi_agent_orchestration", "cross_team_routing", "policy_tag_rules", "human_approval_gate", "frontend_handoff"),
    ),
)

DEMO_SCENARIO_IDS: tuple[str, ...] = tuple(item.scenario_id for item in SCENARIOS)


def _scope_key(scope: Scope) -> tuple[str, str, str]:
    return (scope.tenant_id, scope.workspace_id, scope.project_id)


class ScenarioEvidenceProvider:
    def __init__(self) -> None:
        self._scenarios = {item.scenario_id: item for item in SCENARIOS}
        self._memories: dict[tuple[str, str, str, str], list[Evidence]] = defaultdict(list)
        self._org_policies: dict[tuple[str, str, str], list[Evidence]] = defaultdict(list)
        self._intake_sessions: dict[str, dict] = {}
        self._lock = RLock()

    def get_scenario(self, scenario_id: str) -> Scenario:
        try:
            return self._scenarios[scenario_id]
        except KeyError as exc:
            raise NotFoundError("Demo scenario was not found.") from exc

    def list_scenarios(self) -> list[Scenario]:
        return list(self._scenarios.values())

    def retrieve(self, scope: Scope, scenario_id: str, query: str, token_budget: int) -> tuple[list[Evidence], list[dict[str, str]]]:
        scenario = self.get_scenario(scenario_id)
        key = (scope.tenant_id, scope.workspace_id, scope.project_id, scenario_id)
        candidates = [*scenario.evidence, *self._memories[key], *self._org_policies[_scope_key(scope)]]
        query_terms = set(query.lower().replace("_", " ").split())
        ranked: list[tuple[int, Evidence]] = []
        excluded: list[dict[str, str]] = []
        for evidence in candidates:
            if evidence.restricted:
                excluded.append({"evidence_id": evidence.evidence_id, "reason": "restricted_memory_boundary"})
                continue
            if evidence.status != "active":
                excluded.append({"evidence_id": evidence.evidence_id, "reason": "not_current"})
                continue
            text_terms = set((evidence.title + " " + evidence.content + " " + " ".join(evidence.tags)).lower().replace("_", " ").split())
            score = len(query_terms.intersection(text_terms)) + (3 if evidence.kind in {"policy", "decision", "incident"} else 1)
            if evidence.evidence_id.startswith("org_policy_"):
                score += 4
            ranked.append((score, evidence))
        selected: list[Evidence] = []
        used = 0
        for _, evidence in sorted(ranked, key=lambda pair: (-pair[0], pair[1].evidence_id)):
            estimate = max(1, len(evidence.content.split()) * 2)
            if used + estimate > token_budget:
                excluded.append({"evidence_id": evidence.evidence_id, "reason": "context_budget_exceeded"})
                continue
            selected.append(evidence)
            used += estimate
        return selected, excluded

    def remember_decision(self, scope: Scope, scenario_id: str, title: str, content: str, evidence_refs: list[str]) -> str:
        key = (scope.tenant_id, scope.workspace_id, scope.project_id, scenario_id)
        with self._lock:
            evidence_id = f"memory_{len(self._memories[key]) + 1}"
            self._memories[key].append(Evidence(evidence_id, "decision", title, content, tags=("approved", "cross-session", *evidence_refs)))
            return evidence_id

    def list_org_policies(self, scope: Scope) -> list[dict[str, str]]:
        with self._lock:
            return [
                {
                    "evidence_id": item.evidence_id,
                    "title": item.title,
                    "policy_text": item.content,
                    "policy_tag": item.tags[0] if item.tags else "",
                    "tags": list(item.tags),
                }
                for item in self._org_policies[_scope_key(scope)]
            ]

    def _existing_org_tags(self, scope: Scope) -> set[str]:
        tags: set[str] = set()
        for item in self._org_policies[_scope_key(scope)]:
            tags.update(item.tags)
        return tags

    def start_org_policy_intake(
        self,
        scope: Scope,
        session_id: str,
        scenario_id: str,
        process_narrative: str,
        constraints: str,
    ) -> dict:
        scenario = self.get_scenario(scenario_id)
        analysis = analyze_intake(
            session_id,
            scenario_id,
            process_narrative,
            constraints,
            scenario.required_policies,
            self._existing_org_tags(scope),
        )
        payload = analysis.as_dict(session_id, scenario_id)
        payload["scope"] = {"tenant_id": scope.tenant_id, "workspace_id": scope.workspace_id, "project_id": scope.project_id}
        payload["process_narrative"] = process_narrative
        payload["constraints"] = constraints
        with self._lock:
            self._intake_sessions[session_id] = payload
        return payload

    def get_org_policy_intake(self, session_id: str) -> dict:
        with self._lock:
            try:
                return dict(self._intake_sessions[session_id])
            except KeyError as exc:
                raise NotFoundError("Org policy intake session was not found.") from exc

    def resolve_org_policy_challenge(self, scope: Scope, session_id: str, challenge_id: str, option_id: str) -> dict:
        with self._lock:
            session = self.get_org_policy_intake(session_id)
            if session["scope"]["project_id"] != scope.project_id:
                raise ValidationError("Intake session scope does not match project.")
            updated = False
            for challenge in session.get("challenges") or []:
                if challenge["challenge_id"] != challenge_id:
                    continue
                options = {opt["option_id"] for opt in challenge.get("options") or []}
                if option_id not in options:
                    raise ValidationError("challenge option_id is invalid")
                challenge["resolved"] = True
                challenge["resolution"] = {"option_id": option_id}
                updated = True
                break
            if not updated:
                raise NotFoundError("Challenge was not found in intake session.")
            pending = [c for c in session.get("challenges") or [] if not c.get("resolved")]
            session["state"] = "challenges_pending" if pending else "rules_pending_approval"
            self._intake_sessions[session_id] = session
            return dict(session)

    def activate_org_policy_intake(
        self,
        scope: Scope,
        session_id: str,
        adopted_candidate_ids: list[str],
        actor_id: str,
    ) -> dict:
        with self._lock:
            session = self.get_org_policy_intake(session_id)
            if session["scope"]["project_id"] != scope.project_id:
                raise ValidationError("Intake session scope does not match project.")
            pending = [c for c in session.get("challenges") or [] if not c.get("resolved")]
            if pending:
                raise ValidationError("Resolve all challenges before activating policies.")
            to_apply = candidates_to_activate(session, adopted_candidate_ids)
            key = _scope_key(scope)
            activated: list[dict[str, str]] = []
            for cand in to_apply:
                tag = cand["policy_tag"]
                evidence_id = f"org_policy_{tag}_{len(self._org_policies[key]) + 1}"
                self._org_policies[key] = [
                    *self._org_policies[key],
                    Evidence(
                        evidence_id,
                        "policy",
                        cand["title"],
                        cand["policy_text"],
                        tags=(tag, "org-intake", f"actor:{actor_id}"),
                    ),
                ]
                activated.append(
                    {
                        "evidence_id": evidence_id,
                        "policy_tag": tag,
                        "title": cand["title"],
                        "llm_managed_summary": (
                            f"Active org policy for {tag}. Policy Guardian should cite {evidence_id} when this tag applies."
                        ),
                    }
                )
            session["state"] = "partially_active" if activated else "completed"
            session["activated_policies"] = activated
            self._intake_sessions[session_id] = session
            return {"intake_session": session, "activated_policies": activated}
