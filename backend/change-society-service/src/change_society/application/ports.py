from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from ..contracts.agent_adapter import AgentExecutionRequest, AgentExecutionResult
from ..domain.control_plane import AgentTicket, ManagedAgent
from ..domain.models import Evidence, Scope, SocietyRun


@dataclass(frozen=True)
class ModelResult:
    payload: dict[str, Any]
    input_tokens: int
    output_tokens: int
    duration_ms: int
    model: str


@dataclass(frozen=True)
class Scenario:
    scenario_id: str
    title: str
    default_request: str
    evidence: tuple[Evidence, ...]
    expected_impacts: tuple[str, ...]
    required_policies: tuple[str, ...]
    required_tasks: tuple[str, ...]
    requires_negotiation: bool = False
    domain: str = "engineering"
    governance_rules: tuple[str, ...] = ()
    feature_demonstrations: tuple[str, ...] = ()

    def public(self) -> dict[str, Any]:
        return {
            "scenario_id": self.scenario_id,
            "title": self.title,
            "default_request": self.default_request,
            "domain": self.domain,
            "governance_rules": list(self.governance_rules),
            "feature_demonstrations": list(self.feature_demonstrations),
            "evidence_count": len(self.evidence),
            "expected_impacts": list(self.expected_impacts),
            "required_policies": list(self.required_policies),
            "required_tasks": list(self.required_tasks),
            "requires_negotiation": self.requires_negotiation,
        }


class ModelClient(Protocol):
    def complete(self, role: str, system_prompt: str, user_prompt: str, output_schema: type[Any]) -> ModelResult: ...
    def health(self) -> dict[str, Any]: ...


class RunRepository(Protocol):
    def get(self, scope: Scope, run_id: str) -> SocietyRun: ...
    def save(self, run: SocietyRun, expected_version: int | None = None) -> None: ...
    def find_idempotent(self, scope: Scope, command: str, key: str, fingerprint: str) -> str | None: ...
    def remember_idempotent(self, scope: Scope, command: str, key: str, fingerprint: str, run_id: str) -> None: ...
    def list_runs(self, scope: Scope) -> list[SocietyRun]: ...
    def health(self) -> dict[str, Any]: ...


class ControlPlaneRepository(Protocol):
    def save_agent(self, agent: ManagedAgent, expected_version: int | None = None) -> None: ...
    def get_agent(self, scope: Scope, agent_id: str) -> ManagedAgent: ...
    def list_agents(self, scope: Scope) -> list[ManagedAgent]: ...
    def save_ticket(self, ticket: AgentTicket, expected_version: int | None = None) -> None: ...
    def get_ticket(self, scope: Scope, ticket_id: str) -> AgentTicket: ...
    def list_tickets(self, scope: Scope, run_id: str | None = None) -> list[AgentTicket]: ...


class AgentAdapter(Protocol):
    def execute(self, agent: ManagedAgent, request: AgentExecutionRequest) -> AgentExecutionResult: ...
    def health(self, agent: ManagedAgent) -> dict[str, Any]: ...


class AgentAdapterRegistry(Protocol):
    def get(self, adapter_type: str) -> AgentAdapter: ...


class EvidenceProvider(Protocol):
    def get_scenario(self, scenario_id: str) -> Scenario: ...
    def list_scenarios(self) -> list[Scenario]: ...
    def retrieve(self, scope: Scope, scenario_id: str, query: str, token_budget: int) -> tuple[list[Evidence], list[dict[str, str]]]: ...
    def remember_decision(self, scope: Scope, scenario_id: str, title: str, content: str, evidence_refs: list[str]) -> str: ...


class Clock(Protocol):
    def now(self) -> str: ...


class IdGenerator(Protocol):
    def new(self, prefix: str) -> str: ...
