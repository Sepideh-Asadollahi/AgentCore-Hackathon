from __future__ import annotations

from typing import Any

from ..domain.models import SocietyRun
from .evaluation import score_output
from .ports import Scenario


def _sender_role_value(message: Any) -> str:
    role = message.sender_role
    return role.value if hasattr(role, "value") else str(role)


def _role_payload(run: SocietyRun, role: str, message_type: str | None = None) -> dict[str, Any] | None:
    for message in run.messages:
        if _sender_role_value(message) != role:
            continue
        if message_type is not None and message.message_type != message_type:
            continue
        return dict(message.payload)
    return None


def merge_specialist_outputs(*payloads: dict[str, Any] | None) -> dict[str, Any]:
    merged: dict[str, Any] = {
        "impacts": [],
        "policies": [],
        "tasks": [],
        "findings": [],
        "evidence_refs": [],
    }
    for payload in payloads:
        if not payload:
            continue
        for key in merged:
            values = payload.get(key, [])
            if isinstance(values, list):
                merged[key].extend(values)
    merged["evidence_refs"] = sorted(set(merged["evidence_refs"]))
    merged["impacts"] = list(dict.fromkeys(merged["impacts"]))
    merged["policies"] = list(dict.fromkeys(merged["policies"]))
    merged["tasks"] = list(dict.fromkeys(merged["tasks"]))
    return merged


def _variant_metrics(scenario: Scenario, merged: dict[str, Any]) -> dict[str, Any]:
    return score_output(scenario, merged)


def compute_ablation_variants(
    run: SocietyRun,
    scenario: Scenario,
    single_agent_metrics: dict[str, Any],
) -> dict[str, Any]:
    """Counterfactual scores derived from the same run evidence and specialist messages."""
    change_initial = _role_payload(run, "change_analyst", "specialist_finding")
    impact = _role_payload(run, "impact_analyst", "specialist_finding")
    policy = _role_payload(run, "policy_guardian", "specialist_finding")
    change_rebuttal = _role_payload(run, "change_analyst", "rebuttal_response")
    judge = _role_payload(run, "coordinator", "coordinator_decision")

    without_policy = _variant_metrics(scenario, merge_specialist_outputs(change_initial, impact))
    without_negotiation = _variant_metrics(scenario, merge_specialist_outputs(change_initial, impact, policy))

    change_for_full = change_rebuttal or change_initial
    society_scored = _variant_metrics(scenario, merge_specialist_outputs(change_for_full, impact, policy))
    society_measured = {
        **society_scored,
        "total_tokens": int(run.metrics.get("total_tokens", 0)),
        "agent_message_count": int(run.metrics.get("agent_message_count", 0)),
        "conflict_count": int(run.metrics.get("conflict_count", 0)),
        "model_duration_ms": int(run.metrics.get("model_duration_ms", 0)),
    }

    stale_exclusions = sum(1 for item in run.excluded_evidence if item.get("reason") == "not_current")
    restricted_exclusions = sum(1 for item in run.excluded_evidence if item.get("reason") == "restricted_memory_boundary")

    required_approvers: list[str] = []
    if judge:
        required_approvers = list(judge.get("required_approvers", []))
    elif policy:
        required_approvers = list(policy.get("required_approvers", []))

    variants = [
        {
            "variant_id": "single_agent",
            "label": "Single agent baseline",
            "description": "One generic reviewer with the same evidence bundle and JSON schema.",
            "metrics": single_agent_metrics,
        },
        {
            "variant_id": "society_without_negotiation",
            "label": "Multi-agent without negotiation",
            "description": "Pre-rebuttal specialist payloads only (no bounded rebuttal round).",
            "metrics": without_negotiation,
        },
        {
            "variant_id": "society_without_policy_guardian",
            "label": "Multi-agent without Policy Guardian",
            "description": "Change and Impact outputs only; policy role omitted from scoring.",
            "metrics": without_policy,
        },
        {
            "variant_id": "full_change_society",
            "label": "Full Change Society",
            "description": "Measured society run including negotiation, policy, coordinator, and human gate.",
            "metrics": society_measured,
        },
    ]

    if change_rebuttal:
        variants[1]["note"] = "Compare with full society; rebuttal may change reconciled risk and tasks."

    return {
        "variants": variants,
        "operational_signals": {
            "stale_memory_exclusions": stale_exclusions,
            "restricted_memory_exclusions": restricted_exclusions,
            "conflict_count": len(run.conflicts),
            "required_approvers_identified": required_approvers,
            "human_gate_state": run.state,
        },
        "efficiency": _efficiency_frame(single_agent_metrics, society_measured, run),
        "methodology": (
            "Same scenario, evidence retrieval budget, and model client for baseline and society. "
            "Ablation variants re-score stored specialist payloads (counterfactuals). "
            "Repeat runs with the same Qwen model and temperature for statistical claims."
        ),
    }


def _efficiency_frame(baseline: dict[str, Any], society: dict[str, Any], run: SocietyRun) -> dict[str, Any]:
    base_tokens = int(baseline.get("input_tokens", 0) + baseline.get("output_tokens", 0))
    society_tokens = int(run.metrics.get("total_tokens", 0))
    impact = float(society.get("critical_impact_recall", 0))
    base_impact = float(baseline.get("critical_impact_recall", 0))
    token_denominator = max(society_tokens, 1)
    return {
        "society_total_tokens": society_tokens,
        "baseline_total_tokens": base_tokens,
        "token_delta": society_tokens - base_tokens,
        "critical_risks_per_10k_tokens_society": round((impact * 10_000) / token_denominator, 2),
        "critical_risks_per_10k_tokens_baseline": round((base_impact * 10_000) / max(base_tokens, 1), 2),
        "impact_recall_delta": round(impact - base_impact, 4),
        "interpretation": (
            "Society uses more tokens on fixed scenarios; efficiency is framed as critical-risk recall per 10K tokens."
        ),
    }


def aggregate_benchmark_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Aggregate evaluate-all-scenarios output into judge-facing summary tables."""

    def avg_nested(evaluation: dict[str, Any], block_key: str, metric_key: str) -> float:
        block = evaluation.get(block_key, {})
        if metric_key not in block:
            return 0.0
        return float(block[metric_key])

    def sum_raw(block_key: str, found_key: str, total_key: str) -> tuple[int, int]:
        found = total = 0
        for row in rows:
            evaluation = row.get("evaluation", row)
            raw = evaluation.get(block_key, {}).get("raw", {})
            found += int(raw.get(found_key, 0))
            total += int(raw.get(total_key, 0))
        return found, total

    impact_found, impact_total = sum_raw("society", "impact_found", "impact_total")
    policy_found, policy_total = sum_raw("society", "policy_found", "policy_total")
    base_impact_found, base_impact_total = sum_raw("baseline", "impact_found", "impact_total")
    base_policy_found, base_policy_total = sum_raw("baseline", "policy_found", "policy_total")

    ablation_avg: dict[str, float] = {}
    for variant_id in (
        "single_agent",
        "society_without_negotiation",
        "society_without_policy_guardian",
        "full_change_society",
    ):
        recalls = []
        for row in rows:
            evaluation = row.get("evaluation", row)
            for variant in evaluation.get("ablation", {}).get("variants", []):
                if variant.get("variant_id") == variant_id:
                    recalls.append(float(variant["metrics"]["critical_impact_recall"]))
        ablation_avg[variant_id] = round(sum(recalls) / len(recalls), 4) if recalls else 0.0

    evaluations = [row.get("evaluation", row) for row in rows]
    return {
        "scenario_count": len(rows),
        "aggregate_table": {
            "critical_impact_recall": {
                "single_agent": round(sum(avg_nested(e, "baseline", "critical_impact_recall") for e in evaluations) / max(len(evaluations), 1), 4),
                "change_society": round(sum(avg_nested(e, "society", "critical_impact_recall") for e in evaluations) / max(len(evaluations), 1), 4),
                "society_raw": f"{impact_found}/{impact_total}",
                "baseline_raw": f"{base_impact_found}/{base_impact_total}",
            },
            "policy_match_recall": {
                "single_agent": round(sum(avg_nested(e, "baseline", "policy_match_recall") for e in evaluations) / max(len(evaluations), 1), 4),
                "change_society": round(sum(avg_nested(e, "society", "policy_match_recall") for e in evaluations) / max(len(evaluations), 1), 4),
                "society_raw": f"{policy_found}/{policy_total}",
                "baseline_raw": f"{base_policy_found}/{base_policy_total}",
            },
            "task_completeness": {
                "single_agent": round(sum(avg_nested(e, "baseline", "task_completeness") for e in evaluations) / max(len(evaluations), 1), 4),
                "change_society": round(sum(avg_nested(e, "society", "task_completeness") for e in evaluations) / max(len(evaluations), 1), 4),
            },
            "avg_society_tokens": round(
                sum(float(e.get("society", {}).get("total_tokens", 0)) for e in evaluations) / max(len(evaluations), 1),
                1,
            ),
            "avg_baseline_tokens": round(
                sum(
                    float(e.get("baseline", {}).get("input_tokens", 0))
                    + float(e.get("baseline", {}).get("output_tokens", 0))
                    for e in evaluations
                )
                / max(len(evaluations), 1),
                1,
            ),
        },
        "ablation_critical_impact_recall_avg": ablation_avg,
        "caveat": "Fixed-scenario deterministic profile; not statistically significant. Replicate with repeated Qwen runs for production claims.",
    }
