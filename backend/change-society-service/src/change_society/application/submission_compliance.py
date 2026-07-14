from __future__ import annotations

from typing import Any

from change_society.application.judging_engineering_profile import build_judging_engineering_profile
from .ports import ModelClient, RunRepository


TRACK3_REQUIREMENTS = (
    {"id": "distinct_agents", "description": "Multiple managed agents with distinct capabilities"},
    {"id": "task_decomposition", "description": "Durable tickets and capability-based routing"},
    {"id": "dialogue_negotiation", "description": "Universal Agent JSON with bounded rebuttal round"},
    {"id": "conflict_resolution", "description": "Evidence-backed conflict adjudication"},
    {"id": "cross_session_memory", "description": "Scoped memory with stale/restricted exclusion"},
    {"id": "baseline_comparison", "description": "Single-agent baseline on fixed scenarios"},
    {"id": "human_approval", "description": "Fail-closed human checkpoint for high risk"},
    {"id": "qwen_cloud_models", "description": "Qwen Cloud adapter for production-shaped runs"},
)


def build_submission_compliance_report(
    *,
    model: ModelClient,
    repository: RunRepository,
    model_provider: str,
    store: str,
    environment: str,
    alibaba_proof_module: str,
    architecture_doc: str,
    evaluation_artifact: str,
) -> dict[str, Any]:
    model_health = model.health()
    store_health = repository.health()
    production_ready = (
        environment == "production"
        and model_provider == "qwen"
        and store == "postgresql"
        and model_health.get("provider") == "qwen_cloud"
        and bool(model_health.get("configured"))
        and store_health.get("production_ready")
        and store_health.get("ready")
    )
    demo_ready = model_provider == "fake" and store == "memory" and store_health.get("ready")
    return {
        "competition": "Qwen Cloud Hackathon — Track 3 Agent Society",
        "official_rules_url": "https://qwencloud-hackathon.devpost.com/rules",
        "track": "Track 3 — Agent Society",
        "requirements": list(TRACK3_REQUIREMENTS),
        "repository_artifacts": {
            "submission_entry": "hackathon/SUBMISSION.md",
            "architecture_diagram": architecture_doc,
            "alibaba_cloud_code_proof": alibaba_proof_module,
            "evaluation_data": evaluation_artifact,
            "install": "hackathon/install.sh",
            "deterministic_harness": "tests/e2e/change-society/run-real-test.sh",
        },
        "runtime_profile": {
            "environment": environment,
            "model_provider": model_provider,
            "store": store,
            "model": model_health,
            "store_check": store_health,
        },
        "gates": {
            "local_demo_without_api_keys": demo_ready,
            "production_submission_shape": production_ready,
            "qwen_adapter_configured": model_health.get("provider") == "qwen_cloud" and bool(model_health.get("configured")),
        },
        "judging_engineering_profile": build_judging_engineering_profile(model_health=model_health),
        "entrant_owned_submission_fields": (
            "public GitHub URL and license in About",
            "Devpost description and track selection",
            "public demo URL through judging",
            "under-three-minute video",
            "live Alibaba backend deployment",
            "eligibility confirmation",
        ),
    }
