# Hackathon scripts (install and ops only)

Test and evidence harnesses live under the repository **`tests/`** tree (not here).

| Need | Path (from AgentCore repo root) |
|------|----------------------------------|
| Backend pytest | `tests/backend/change-society-service/run-pytest.sh` |
| Integrator unit (`pytest -k integrator`) | `tests/backend/change-society-service/run-integrator-unit-tests.sh` |
| Frontend unit tests | `tests/frontend/change-society/run-frontend-tests.sh` |
| Deterministic society / e2e | `tests/e2e/change-society/` |
| Live Qwen / remote verify | `tests/live/change-society/` |

From **hackathon pack root** (`hackathon/`), prefix with `../tests/…` (monorepo layout).

## Install

```bash
bash install.sh
bash install.sh --profile verify
python3 scripts/install.py --help
```

Core logic: `install.py` + `install_support/` (venv, pip, npm, optional OS packages, Docker Postgres, runtime: manual | systemd | docker).

## Other scripts in this directory

| Script | Purpose |
|--------|---------|
| `pack-env.sh` / `pack_paths.py` | Pack root, venv, `PYTHONPATH` (used by `tests/support/pack-bootstrap.sh`) |
| `apply_change_society_migrations.py` | Database migrations |
| `publish-rsync-excludes.txt` | Publish allowlist |
| `push-github-hackathon.local.sh` | Local-only public repo sync (gitignored env) |

## Documentation

- [docs/06-testing-and-evaluation.md](../docs/06-testing-and-evaluation.md)
- [../../tests/README.md](../../tests/README.md)
