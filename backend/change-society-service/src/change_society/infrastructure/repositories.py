from __future__ import annotations

from copy import deepcopy
from threading import RLock
from typing import Any

from ..domain.models import (
    AgentMessage, ApprovalDecision, ConflictError, ConflictRecord, NotFoundError, RiskLevel, Role, RunState, Scope, SocietyRun,
)


def run_to_dict(run: SocietyRun) -> dict[str, Any]:
    return {
        **run.public(),
        "messages": [message.public() for message in run.messages],
        "conflicts": [conflict.public() for conflict in run.conflicts],
    }


def run_from_dict(value: dict[str, Any]) -> SocietyRun:
    scope = Scope(value["tenant_id"], value["workspace_id"], value["project_id"])
    messages = []
    for raw in value.get("messages", []):
        messages.append(AgentMessage(
            raw["protocol_version"], raw["message_id"], raw["message_type"], scope, raw["run_id"], raw["correlation_id"], raw.get("causation_id"),
            Role(raw["sender_role"]), Role(raw["recipient_role"]), raw["capability"], raw["task_ref"], raw["intent"], raw["status"], raw["payload"],
            raw.get("evidence_refs", []), raw.get("assumptions", []), raw["confidence"], RiskLevel(raw["risk_level"]), raw.get("conflicts", []),
            raw.get("unresolved_questions", []), raw["requested_next_action"], raw["created_at"], raw["idempotency_key"], raw.get("token_usage", {}),
        ))
    conflicts = [ConflictRecord(
        item["conflict_id"], item["topic"], item["claim_a_message_id"], item["claim_b_message_id"], RiskLevel(item["claim_a_risk"]),
        RiskLevel(item["claim_b_risk"]), item.get("evidence_refs", []), item["status"], item.get("resolution"), item.get("rationale"), item.get("rebuttal_message_ids", []),
    ) for item in value.get("conflicts", [])]
    approval = ApprovalDecision(**value["approval"]) if value.get("approval") else None
    return SocietyRun(
        value["run_id"], scope, value["actor_id"], value["correlation_id"], value["request_text"], value["scenario_id"],
        RunState(value["state"]), value["created_at"], value["updated_at"], value["version"], messages, conflicts, approval,
        value.get("final_result"), value.get("metrics", {}), value.get("excluded_evidence", []), value.get("error"),
    )


class InMemoryRunRepository:
    def __init__(self) -> None:
        self._runs: dict[tuple[str, str, str, str], dict[str, Any]] = {}
        self._idempotency: dict[tuple[str, str, str, str, str, str], tuple[str, str]] = {}
        self._lock = RLock()

    @staticmethod
    def _key(scope: Scope, run_id: str) -> tuple[str, str, str, str]:
        return scope.tenant_id, scope.workspace_id, scope.project_id, run_id

    def get(self, scope: Scope, run_id: str) -> SocietyRun:
        try:
            return run_from_dict(deepcopy(self._runs[self._key(scope, run_id)]))
        except KeyError as exc:
            raise NotFoundError() from exc

    def save(self, run: SocietyRun, expected_version: int | None = None) -> None:
        with self._lock:
            current = self._runs.get(self._key(run.scope, run.run_id))
            if expected_version is not None and current and current["version"] != expected_version:
                raise ConflictError("run version is stale")
            self._runs[self._key(run.scope, run.run_id)] = deepcopy(run_to_dict(run))

    def find_idempotent(self, scope: Scope, command: str, key: str, fingerprint: str) -> str | None:
        record = self._idempotency.get((*self._key(scope, "")[:3], command, key, ""))
        if record and record[0] != fingerprint:
            raise ConflictError("idempotency key was reused with a different request")
        return record[1] if record else None

    def remember_idempotent(self, scope: Scope, command: str, key: str, fingerprint: str, run_id: str) -> None:
        idem_key = (*self._key(scope, "")[:3], command, key, "")
        existing = self._idempotency.get(idem_key)
        if existing and existing[0] != fingerprint:
            raise ConflictError("idempotency key was reused with a different request")
        self._idempotency[idem_key] = (fingerprint, run_id)

    def list_runs(self, scope: Scope) -> list[SocietyRun]:
        return [run_from_dict(deepcopy(value)) for key, value in self._runs.items() if key[:3] == (scope.tenant_id, scope.workspace_id, scope.project_id)]

    def latest_for_scenario(self, scope: Scope, scenario_id: str) -> SocietyRun | None:
        matches = [
            run_from_dict(deepcopy(value))
            for key, value in self._runs.items()
            if key[:3] == (scope.tenant_id, scope.workspace_id, scope.project_id) and value.get("scenario_id") == scenario_id
        ]
        if not matches:
            return None
        matches.sort(key=lambda item: item.updated_at, reverse=True)
        return matches[0]

    def health(self) -> dict[str, Any]:
        return {"store": "in_memory_test_fake", "ready": True, "production_ready": False}


class PostgresRunRepository:
    def __init__(self, database_url: str) -> None:
        if not database_url.startswith(("postgresql://", "postgresql+psycopg://")):
            raise ValueError("Change Society database URL must use PostgreSQL")
        import psycopg
        from psycopg.rows import dict_row
        from psycopg.types.json import Jsonb
        self._json = Jsonb
        # autocommit=True: read helpers must not leave an implicit txn open; writes use transaction().
        self._connection = psycopg.connect(database_url.replace("postgresql+psycopg://", "postgresql://", 1), autocommit=True, row_factory=dict_row)

    def get(self, scope: Scope, run_id: str) -> SocietyRun:
        with self._connection.cursor() as cursor:
            cursor.execute("SELECT payload FROM change_society.runs WHERE run_id=%s AND tenant_id=%s AND workspace_id=%s AND project_id=%s", (run_id, scope.tenant_id, scope.workspace_id, scope.project_id))
            row = cursor.fetchone()
        if not row:
            raise NotFoundError()
        return run_from_dict(row["payload"])

    def save(self, run: SocietyRun, expected_version: int | None = None) -> None:
        payload = run_to_dict(run)
        try:
            with self._connection.transaction(), self._connection.cursor() as cursor:
                if expected_version is not None:
                    cursor.execute("SELECT version FROM change_society.runs WHERE run_id=%s FOR UPDATE", (run.run_id,))
                    row = cursor.fetchone()
                    if row and row["version"] != expected_version:
                        raise ConflictError("run version is stale")
                cursor.execute(
                    """INSERT INTO change_society.runs(run_id,tenant_id,workspace_id,project_id,state,version,payload,created_at,updated_at)
                       VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s)
                       ON CONFLICT(run_id) DO UPDATE SET state=EXCLUDED.state,version=EXCLUDED.version,payload=EXCLUDED.payload,updated_at=EXCLUDED.updated_at""",
                    (run.run_id, run.scope.tenant_id, run.scope.workspace_id, run.scope.project_id, run.state.value, run.version, self._json(payload), run.created_at, run.updated_at),
                )
        except Exception:
            self._connection.rollback()
            raise

    def find_idempotent(self, scope: Scope, command: str, key: str, fingerprint: str) -> str | None:
        with self._connection.cursor() as cursor:
            cursor.execute("SELECT fingerprint,run_id FROM change_society.idempotency WHERE tenant_id=%s AND workspace_id=%s AND project_id=%s AND command=%s AND idempotency_key=%s", (scope.tenant_id, scope.workspace_id, scope.project_id, command, key))
            row = cursor.fetchone()
        if row and row["fingerprint"] != fingerprint:
            raise ConflictError("idempotency key was reused with a different request")
        return row["run_id"] if row else None

    def remember_idempotent(self, scope: Scope, command: str, key: str, fingerprint: str, run_id: str) -> None:
        try:
            with self._connection.transaction(), self._connection.cursor() as cursor:
                cursor.execute("""INSERT INTO change_society.idempotency(tenant_id,workspace_id,project_id,command,idempotency_key,fingerprint,run_id)
                    VALUES(%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING""", (scope.tenant_id, scope.workspace_id, scope.project_id, command, key, fingerprint, run_id))
        except Exception:
            self._connection.rollback()
            raise

    def list_runs(self, scope: Scope) -> list[SocietyRun]:
        with self._connection.cursor() as cursor:
            cursor.execute("SELECT payload FROM change_society.runs WHERE tenant_id=%s AND workspace_id=%s AND project_id=%s ORDER BY created_at DESC", (scope.tenant_id, scope.workspace_id, scope.project_id))
            return [run_from_dict(row["payload"]) for row in cursor.fetchall()]

    def latest_for_scenario(self, scope: Scope, scenario_id: str) -> SocietyRun | None:
        with self._connection.cursor() as cursor:
            cursor.execute(
                """SELECT payload FROM change_society.runs
                   WHERE tenant_id=%s AND workspace_id=%s AND project_id=%s
                     AND payload->>'scenario_id' = %s
                   ORDER BY updated_at DESC LIMIT 1""",
                (scope.tenant_id, scope.workspace_id, scope.project_id, scenario_id),
            )
            row = cursor.fetchone()
        if not row:
            return None
        return run_from_dict(row["payload"])

    def health(self) -> dict[str, Any]:
        try:
            with self._connection.cursor() as cursor:
                cursor.execute("SELECT 1 AS ok")
                return {"store": "postgresql", "ready": cursor.fetchone()["ok"] == 1, "production_ready": True}
        except Exception:
            return {"store": "postgresql", "ready": False, "production_ready": True}

    def close(self) -> None:
        self._connection.close()
