CREATE SCHEMA IF NOT EXISTS change_society;

CREATE TABLE IF NOT EXISTS change_society.runs (
    run_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    state TEXT NOT NULL,
    version INTEGER NOT NULL CHECK (version > 0),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_change_society_runs_scope_created
ON change_society.runs(tenant_id, workspace_id, project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS change_society.idempotency (
    tenant_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    command TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    run_id TEXT NOT NULL REFERENCES change_society.runs(run_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY(tenant_id, workspace_id, project_id, command, idempotency_key)
);
