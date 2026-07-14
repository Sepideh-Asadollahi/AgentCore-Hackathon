from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger("change_society.control_plane")

from ..contracts.agent_adapter import AgentExecutionRequest
from ..domain.control_plane import AgentState, AgentTicket, ManagedAgent, TicketState
from ..domain.models import ConflictError, NotFoundError, Scope, ValidationError
from .ports import AgentAdapterRegistry, Clock, ControlPlaneRepository, IdGenerator, ModelResult


@dataclass(frozen=True)
class AgentTemplate:
    key: str
    name: str
    provider: str
    adapter_type: str
    capabilities: tuple[str, ...]
    role: str
    description: str
    endpoint: str | None = None


class CapabilityRouter:
    """Deterministic, explainable router. Model recommendations may rank only eligible agents."""

    def select(self, agents: list[ManagedAgent], capability: str) -> ManagedAgent:
        eligible = [agent for agent in agents if agent.supports(capability)]
        if not eligible:
            raise ConflictError("no online agent supports the required capability", {"capability": capability})
        return sorted(eligible, key=lambda item: (item.active_ticket_count, item.agent_id))[0]


class AgentControlPlane:
    def __init__(self, repository: ControlPlaneRepository, adapters: AgentAdapterRegistry, router: CapabilityRouter,
                 clock: Clock, ids: IdGenerator, templates: tuple[AgentTemplate, ...]):
        self.repository = repository
        self.adapters = adapters
        self.router = router
        self.clock = clock
        self.ids = ids
        self.templates = templates

    def ensure_agents(self, scope: Scope) -> list[ManagedAgent]:
        existing = self.repository.list_agents(scope)
        by_template = {agent.metadata.get("template_key"): agent for agent in existing}
        for template in self.templates:
            if template.key in by_template:
                agent = by_template[template.key]
                dirty = False
                if template.endpoint and agent.endpoint != template.endpoint:
                    agent.endpoint = template.endpoint
                    dirty = True
                if agent.adapter_type != template.adapter_type:
                    agent.adapter_type = template.adapter_type
                    dirty = True
                if dirty:
                    expected = agent.version
                    agent.updated_at = self.clock.now()
                    agent.version += 1
                    self.repository.save_agent(agent, expected)
                continue
            now = self.clock.now()
            agent = ManagedAgent(
                self.ids.new("agent"), scope, template.name, template.provider, template.adapter_type,
                template.capabilities, AgentState.ONLINE, now, now, endpoint=template.endpoint, role=template.role,
                description=template.description, last_heartbeat_at=now, metadata={"template_key": template.key},
            )
            self.repository.save_agent(agent)
        return self.repository.list_agents(scope)

    def list_agents(self, scope: Scope) -> list[ManagedAgent]:
        return self.ensure_agents(scope)

    def heartbeat(self, scope: Scope, agent_id: str, healthy: bool, expected_version: int) -> ManagedAgent:
        agent = self.repository.get_agent(scope, agent_id)
        if agent.version != expected_version:
            raise ConflictError("agent version is stale", {"current_version": agent.version})
        if agent.state == AgentState.REVOKED:
            raise ConflictError("revoked agent cannot heartbeat")
        agent.state = AgentState.ONLINE if healthy else AgentState.DEGRADED
        agent.last_heartbeat_at = self.clock.now()
        agent.updated_at = agent.last_heartbeat_at
        agent.version += 1
        self.repository.save_agent(agent, expected_version)
        return agent

    def set_agent_state(self, scope: Scope, agent_id: str, target: AgentState, expected_version: int) -> ManagedAgent:
        agent = self.repository.get_agent(scope, agent_id)
        if agent.version != expected_version:
            raise ConflictError("agent version is stale", {"current_version": agent.version})
        if agent.state == AgentState.REVOKED:
            raise ConflictError("revoked agent lifecycle is terminal")
        if target not in {AgentState.ONLINE, AgentState.PAUSED, AgentState.OFFLINE, AgentState.REVOKED}:
            raise ValidationError("unsupported operator lifecycle target")
        agent.state = target
        agent.updated_at = self.clock.now()
        agent.version += 1
        self.repository.save_agent(agent, expected_version)
        return agent

    def create_ticket(self, scope: Scope, run_id: str, title: str, capability: str, payload: dict[str, Any],
                      actor_id: str, correlation_id: str, acceptance_criteria: tuple[str, ...] = ("return schema-valid evidence",)) -> AgentTicket:
        agents = self.ensure_agents(scope)
        selected = self.router.select(agents, capability)
        now = self.clock.now()
        ticket = AgentTicket(self.ids.new("ticket"), scope, run_id, title, capability, payload, acceptance_criteria,
                             TicketState.CREATED, 50, actor_id, correlation_id, now, now)
        self.repository.save_ticket(ticket)
        persisted_version = ticket.version
        ticket.assigned_agent_id = selected.agent_id
        ticket.transition(TicketState.ASSIGNED, "agentcore-router", self.clock.now(), self.ids.new("event"),
                          {"routing_reason": "capability_match_lowest_active_load", "agent_id": selected.agent_id})
        self.repository.save_ticket(ticket, persisted_version)
        logger.info(
            "ticket created ticket_id=%s run_id=%s capability=%s agent_id=%s cid=%s",
            ticket.ticket_id,
            run_id,
            capability,
            selected.agent_id,
            correlation_id,
        )
        return ticket

    def execute_ticket(self, ticket: AgentTicket, system_prompt: str, user_prompt: str, output_schema: type[Any]) -> ModelResult:
        if ticket.state != TicketState.ASSIGNED or not ticket.assigned_agent_id:
            raise ConflictError("ticket must be assigned before dispatch")
        agent = self.repository.get_agent(ticket.scope, ticket.assigned_agent_id)
        if not agent.supports(ticket.capability):
            raise ConflictError("assigned agent is no longer eligible", {"agent_id": agent.agent_id})
        persisted_ticket_version = ticket.version
        ticket.transition(TicketState.CLAIMED, agent.agent_id, self.clock.now(), self.ids.new("event"))
        ticket.claimed_at = ticket.updated_at
        ticket.transition(TicketState.IN_PROGRESS, agent.agent_id, self.clock.now(), self.ids.new("event"))
        self.repository.save_ticket(ticket, persisted_ticket_version)
        persisted_ticket_version = ticket.version
        persisted_agent_version = agent.version
        agent.active_ticket_count += 1
        agent.version += 1
        agent.updated_at = self.clock.now()
        self.repository.save_agent(agent, persisted_agent_version)
        logger.info(
            "ticket execute start ticket_id=%s run_id=%s capability=%s agent_id=%s adapter=%s schema=%s cid=%s",
            ticket.ticket_id,
            ticket.run_id,
            ticket.capability,
            agent.agent_id,
            agent.adapter_type,
            getattr(output_schema, "__name__", str(output_schema)),
            ticket.correlation_id,
        )
        try:
            adapter = self.adapters.get(agent.adapter_type)
            result = adapter.execute(agent, AgentExecutionRequest(
                ticket.ticket_id, agent.agent_id, agent.role or agent.name, system_prompt, user_prompt,
                output_schema, ticket.correlation_id,
            ))
            logger.info(
                "ticket execute ok ticket_id=%s run_id=%s duration_ms=%s in_tokens=%s out_tokens=%s runtime=%s",
                ticket.ticket_id,
                ticket.run_id,
                result.duration_ms,
                result.input_tokens,
                result.output_tokens,
                result.runtime,
            )
            ticket.output_payload = result.payload
            ticket.execution_metrics = {"input_tokens": result.input_tokens, "output_tokens": result.output_tokens,
                                        "duration_ms": result.duration_ms, "runtime": result.runtime,
                                        "external_execution_id": result.external_execution_id}
            ticket.transition(TicketState.REVIEW, "agentcore-dispatcher", self.clock.now(), self.ids.new("event"))
            ticket.transition(TicketState.COMPLETED, "agentcore-schema-review", self.clock.now(), self.ids.new("event"),
                              {"acceptance": "schema_validated"})
            self.repository.save_ticket(ticket, persisted_ticket_version)
            return ModelResult(result.payload, result.input_tokens, result.output_tokens, result.duration_ms, result.runtime)
        except Exception as exc:
            logger.warning(
                "ticket execute failed ticket_id=%s run_id=%s error_code=%s message=%s",
                ticket.ticket_id,
                ticket.run_id,
                getattr(exc, "code", "agent_execution_failed"),
                getattr(exc, "message", str(exc)),
            )
            ticket.error = {"error_code": getattr(exc, "code", "agent_execution_failed"), "message": getattr(exc, "message", "Agent execution failed.")}
            if ticket.state == TicketState.IN_PROGRESS:
                ticket.transition(TicketState.FAILED, "agentcore-dispatcher", self.clock.now(), self.ids.new("event"))
            self.repository.save_ticket(ticket, persisted_ticket_version)
            raise
        finally:
            persisted_agent_version = agent.version
            agent.active_ticket_count = max(0, agent.active_ticket_count - 1)
            agent.version += 1
            agent.updated_at = self.clock.now()
            self.repository.save_agent(agent, persisted_agent_version)

    def list_tickets(self, scope: Scope, run_id: str | None = None) -> list[AgentTicket]:
        return self.repository.list_tickets(scope, run_id)

    def get_ticket(self, scope: Scope, ticket_id: str) -> AgentTicket:
        try:
            return self.repository.get_ticket(scope, ticket_id)
        except NotFoundError:
            raise
