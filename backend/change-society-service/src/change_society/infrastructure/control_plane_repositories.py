from __future__ import annotations

from copy import deepcopy
from threading import RLock
from typing import Any

from ..application.ports import ControlPlaneRepository
from ..domain.control_plane import AgentState, AgentTicket, ManagedAgent, TicketEvent, TicketState
from ..domain.models import ConflictError, NotFoundError, Scope


def agent_from_dict(value: dict[str, Any]) -> ManagedAgent:
    return ManagedAgent(
        value["agent_id"], Scope(value["tenant_id"], value["workspace_id"], value["project_id"]), value["name"],
        value["provider"], value["adapter_type"], tuple(value["capabilities"]), AgentState(value["state"]),
        value["created_at"], value["updated_at"], value.get("endpoint"), value.get("role"), value.get("description", ""),
        value.get("last_heartbeat_at"), value.get("active_ticket_count", 0), value.get("version", 1), value.get("metadata", {}),
    )


def agent_to_dict(agent: ManagedAgent) -> dict[str, Any]:
    return {**agent.public(), "endpoint": agent.endpoint, "role": agent.role}


def ticket_from_dict(value: dict[str, Any]) -> AgentTicket:
    events = [TicketEvent(**event) for event in value.get("events", [])]
    return AgentTicket(
        value["ticket_id"], Scope(value["tenant_id"], value["workspace_id"], value["project_id"]), value["run_id"],
        value["title"], value["capability"], value.get("input_payload", {}), tuple(value.get("acceptance_criteria", [])),
        TicketState(value["state"]), value["priority"], value["created_by"], value["correlation_id"], value["created_at"],
        value["updated_at"], value.get("assigned_agent_id"), value.get("claimed_at"), value.get("output_payload"),
        value.get("error"), value.get("version", 1), events, value.get("execution_metrics", {}),
    )


class InMemoryControlPlaneRepository:
    """Deterministic fake for tests and the safe local demo profile only."""

    def __init__(self) -> None:
        self._agents: dict[tuple[str, str, str, str], dict[str, Any]] = {}
        self._tickets: dict[tuple[str, str, str, str], dict[str, Any]] = {}
        self._lock = RLock()

    @staticmethod
    def _key(scope: Scope, object_id: str) -> tuple[str, str, str, str]:
        return scope.tenant_id, scope.workspace_id, scope.project_id, object_id

    def save_agent(self, agent: ManagedAgent, expected_version: int | None = None) -> None:
        with self._lock:
            current = self._agents.get(self._key(agent.scope, agent.agent_id))
            if expected_version is not None and (not current or current["version"] != expected_version):
                raise ConflictError("agent version is stale")
            self._agents[self._key(agent.scope, agent.agent_id)] = deepcopy(agent_to_dict(agent))

    def get_agent(self, scope: Scope, agent_id: str) -> ManagedAgent:
        try:
            return agent_from_dict(deepcopy(self._agents[self._key(scope, agent_id)]))
        except KeyError as exc:
            raise NotFoundError("Managed agent was not found.") from exc

    def list_agents(self, scope: Scope) -> list[ManagedAgent]:
        prefix = (scope.tenant_id, scope.workspace_id, scope.project_id)
        return [agent_from_dict(deepcopy(value)) for key, value in self._agents.items() if key[:3] == prefix]

    def save_ticket(self, ticket: AgentTicket, expected_version: int | None = None) -> None:
        with self._lock:
            current = self._tickets.get(self._key(ticket.scope, ticket.ticket_id))
            if expected_version is not None and (not current or current["version"] != expected_version):
                raise ConflictError("ticket version is stale")
            self._tickets[self._key(ticket.scope, ticket.ticket_id)] = deepcopy(ticket.public())

    def get_ticket(self, scope: Scope, ticket_id: str) -> AgentTicket:
        try:
            return ticket_from_dict(deepcopy(self._tickets[self._key(scope, ticket_id)]))
        except KeyError as exc:
            raise NotFoundError("Agent ticket was not found.") from exc

    def list_tickets(self, scope: Scope, run_id: str | None = None) -> list[AgentTicket]:
        prefix = (scope.tenant_id, scope.workspace_id, scope.project_id)
        values = [ticket_from_dict(deepcopy(value)) for key, value in self._tickets.items() if key[:3] == prefix]
        return [ticket for ticket in values if run_id is None or ticket.run_id == run_id]


class PostgresControlPlaneRepository:
    def __init__(self, database_url: str) -> None:
        import psycopg
        from psycopg.rows import dict_row
        from psycopg.types.json import Jsonb
        self._json = Jsonb
        # autocommit=True: read helpers must not leave an implicit txn open; writes use transaction().
        self._connection = psycopg.connect(database_url.replace("postgresql+psycopg://", "postgresql://", 1), autocommit=True, row_factory=dict_row)

    @staticmethod
    def _scope(scope: Scope) -> tuple[str, str, str]:
        return scope.tenant_id, scope.workspace_id, scope.project_id

    def _save(self, table: str, object_id: str, scope: Scope, state: str, version: int, payload: dict[str, Any], expected_version: int | None) -> None:
        id_column = "agent_id" if table == "agents" else "ticket_id"
        with self._connection.transaction(), self._connection.cursor() as cursor:
            if expected_version is not None:
                cursor.execute(f"SELECT version FROM change_society.{table} WHERE {id_column}=%s FOR UPDATE", (object_id,))
                row = cursor.fetchone()
                if not row or row["version"] != expected_version:
                    raise ConflictError(f"{table[:-1]} version is stale")
            cursor.execute(
                f"INSERT INTO change_society.{table}({id_column},tenant_id,workspace_id,project_id,state,version,payload,created_at,updated_at) "
                f"VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT({id_column}) DO UPDATE SET state=EXCLUDED.state,version=EXCLUDED.version,payload=EXCLUDED.payload,updated_at=EXCLUDED.updated_at",
                (object_id, *self._scope(scope), state, version, self._json(payload), payload["created_at"], payload["updated_at"]),
            )

    def save_agent(self, agent: ManagedAgent, expected_version: int | None = None) -> None:
        self._save("agents", agent.agent_id, agent.scope, agent.state.value, agent.version, agent_to_dict(agent), expected_version)

    def get_agent(self, scope: Scope, agent_id: str) -> ManagedAgent:
        with self._connection.cursor() as cursor:
            cursor.execute("SELECT payload FROM change_society.agents WHERE agent_id=%s AND tenant_id=%s AND workspace_id=%s AND project_id=%s", (agent_id, *self._scope(scope)))
            row = cursor.fetchone()
        if not row:
            raise NotFoundError("Managed agent was not found.")
        return agent_from_dict(row["payload"])

    def list_agents(self, scope: Scope) -> list[ManagedAgent]:
        with self._connection.cursor() as cursor:
            cursor.execute("SELECT payload FROM change_society.agents WHERE tenant_id=%s AND workspace_id=%s AND project_id=%s ORDER BY created_at", self._scope(scope))
            return [agent_from_dict(row["payload"]) for row in cursor.fetchall()]

    def save_ticket(self, ticket: AgentTicket, expected_version: int | None = None) -> None:
        payload = ticket.public()
        with self._connection.transaction(), self._connection.cursor() as cursor:
            if expected_version is not None:
                cursor.execute("SELECT version FROM change_society.tickets WHERE ticket_id=%s FOR UPDATE", (ticket.ticket_id,))
                row = cursor.fetchone()
                if not row or row["version"] != expected_version:
                    raise ConflictError("ticket version is stale")
            cursor.execute(
                """INSERT INTO change_society.tickets(ticket_id,tenant_id,workspace_id,project_id,run_id,state,version,payload,created_at,updated_at)
                   VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   ON CONFLICT(ticket_id) DO UPDATE SET run_id=EXCLUDED.run_id,state=EXCLUDED.state,version=EXCLUDED.version,payload=EXCLUDED.payload,updated_at=EXCLUDED.updated_at""",
                (ticket.ticket_id, *self._scope(ticket.scope), ticket.run_id, ticket.state.value, ticket.version,
                 self._json(payload), ticket.created_at, ticket.updated_at),
            )

    def get_ticket(self, scope: Scope, ticket_id: str) -> AgentTicket:
        with self._connection.cursor() as cursor:
            cursor.execute("SELECT payload FROM change_society.tickets WHERE ticket_id=%s AND tenant_id=%s AND workspace_id=%s AND project_id=%s", (ticket_id, *self._scope(scope)))
            row = cursor.fetchone()
        if not row:
            raise NotFoundError("Agent ticket was not found.")
        return ticket_from_dict(row["payload"])

    def list_tickets(self, scope: Scope, run_id: str | None = None) -> list[AgentTicket]:
        query = "SELECT payload FROM change_society.tickets WHERE tenant_id=%s AND workspace_id=%s AND project_id=%s"
        params: tuple[Any, ...] = self._scope(scope)
        if run_id:
            query += " AND run_id=%s"
            params += (run_id,)
        query += " ORDER BY created_at"
        with self._connection.cursor() as cursor:
            cursor.execute(query, params)
            return [ticket_from_dict(row["payload"]) for row in cursor.fetchall()]
