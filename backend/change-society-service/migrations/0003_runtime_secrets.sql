-- Judge/demo runtime secrets (Qwen key and related config). Values are server-side only; never returned to browsers.
CREATE TABLE IF NOT EXISTS change_society_runtime_secrets (
    secret_key TEXT PRIMARY KEY,
    secret_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
