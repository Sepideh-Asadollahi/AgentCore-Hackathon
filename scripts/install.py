#!/usr/bin/env python3
"""AgentCore pack installer (Python-first, idempotent)."""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from pack_paths import pack_root, venv_base, e2e_change_society_dir  # noqa: E402

from install_support import (  # noqa: E402
    RuntimeMode,
    apply_change_society_migrations,
    docker_available,
    ensure_boot_env_from_example,
    ensure_persistence_env,
    gather_interactive_config,
    install_os_dependencies,
    install_systemd_user_units,
    narrative_for_runtime,
    print_banner,
    production_hints,
    start_docker_compose_stack,
    start_docker_postgres,
)
from install_support import run_cmd as support_run_cmd  # noqa: E402
from install_support.install_log import detail, info, install_step, set_verbose, verbose  # noqa: E402
from install_support.postgres_setup import load_dotenv_into_environ  # noqa: E402

MIN_PYTHON = (3, 12)


def ensure_demo_env(pack: Path, env_path: Path, dry_run: bool) -> None:
    ensure_boot_env_from_example(pack, env_path, dry_run=dry_run)


def check_python() -> None:
    if sys.version_info < MIN_PYTHON:
        raise SystemExit(
            f"Python {MIN_PYTHON[0]}.{MIN_PYTHON[1]}+ is required; found {sys.version.split()[0]}."
        )


def run(cmd: list[str], *, cwd: Path | None = None, dry_run: bool = False) -> None:
    support_run_cmd(cmd, dry_run=dry_run, cwd=cwd)


def ensure_venv(pack: Path, dry_run: bool) -> Path:
    base = venv_base(pack)
    venv = base / ".venv"
    python = venv / "bin" / "python"
    if not python.is_file():
        detail(f"Creating virtual environment at {venv}")
        run([sys.executable, "-m", "venv", str(venv)], dry_run=dry_run)
    elif dry_run:
        detail(f"Would use existing virtual environment at {venv}")
    else:
        info(f"Using existing virtual environment at {venv}")
        rehome_venv_script_shebangs(venv, python)
    return python


def rehome_venv_script_shebangs(venv: Path, python: Path) -> None:
    """Rewrite #! in venv/bin scripts when the repo path moved (e.g. clone location change)."""
    bin_dir = venv / "bin"
    if not bin_dir.is_dir() or not python.is_file():
        return
    py = python.resolve()
    target = f"#!{py}\n"
    for script in bin_dir.iterdir():
        if not script.is_file() or script.name == "python" or script.name.startswith("python"):
            continue
        try:
            text = script.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if not text.startswith("#!"):
            continue
        first_line, _, rest = text.partition("\n")
        if "python" not in first_line:
            continue
        if first_line + "\n" == target:
            continue
        script.write_text(target + rest, encoding="utf-8")


def install_backend(python: Path, requirements: Path, dry_run: bool, *, label: str) -> None:
    info(f"Requirements file: {requirements}")
    pip_extra = ["-v"] if verbose() else []
    run([str(python), "-m", "pip", "install", "--upgrade", "pip", *pip_extra], dry_run=dry_run)
    run(
        [str(python), "-m", "pip", "install", "-r", str(requirements), *pip_extra],
        dry_run=dry_run,
    )
    detail(f"Finished pip install: {label}")


def install_frontend(frontend: Path, dry_run: bool, skip: bool) -> None:
    if skip:
        detail("Skipping frontend install (--skip-frontend).")
        return
    npm = shutil.which("npm")
    if not npm:
        raise SystemExit(
            "npm not found. Example fixes:\n"
            "  Debian/Ubuntu: bash install.sh --install-os-deps   (uses sudo apt)\n"
            "  Or install Node.js 20+ manually, then re-run: bash install.sh"
        )
    info(f"Using npm: {npm} in {frontend}")
    lock = frontend / "package-lock.json"
    npm_cmd = [npm, "ci"]
    if verbose():
        npm_cmd.append("--loglevel=verbose")
    if lock.is_file():
        info("Found package-lock.json — running npm ci")
        run(npm_cmd, cwd=frontend, dry_run=dry_run)
    else:
        info("No package-lock.json — running npm install")
        run([npm, "install", *(["--loglevel=verbose"] if verbose() else [])], cwd=frontend, dry_run=dry_run)


def run_verify(pack: Path, dry_run: bool) -> None:
    e2e = e2e_change_society_dir(pack)
    if e2e is None:
        detail("Skipping verify: tests/e2e/change-society not found (expected monorepo layout).")
        return
    script = e2e / "tests/e2e/change-society/run-real-test.sh"
    if not script.is_file():
        detail(f"Skipping verify: missing {script}")
        return
    if dry_run:
        detail(f"Would run {script}")
        return
    run(["bash", str(script)], cwd=pack)


def _run_migrations(
    args: argparse.Namespace,
    env_path: Path,
    pack: Path,
    python: Path | None,
) -> None:
    if not args.dry_run:
        load_dotenv_into_environ(env_path)
    if python is None:
        raise SystemExit("Internal error: venv python missing before migrations.")
    apply_change_society_migrations(pack, python, dry_run=args.dry_run, wait=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Install AgentCore Change Society demo dependencies.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples (non-interactive):
  bash install.sh --non-interactive --install-os-deps
  bash install.sh --prerequisites-only
  bash install.sh --non-interactive --profile verify --runtime manual
  bash install.sh --non-interactive --install-os-deps --systemd
  bash install.sh --install-os-deps --runtime systemd
  bash install.sh --runtime docker --profile demo
  bash install.sh --with-postgres --non-interactive

Interactive (default on a TTY): numbered menus with examples for profile, OS packages, runtime, optional Postgres.
""",
    )
    parser.add_argument(
        "--profile",
        choices=("demo", "verify", "production"),
        default=None,
        help="demo (default): venv + deps + demo .env (qwen); verify: + tests/e2e/change-society/run-real-test.sh (live Qwen); production: hints only",
    )
    parser.add_argument(
        "--runtime",
        choices=("manual", "systemd", "docker", "none"),
        default=None,
        help="How to run after install. Interactive prompt on TTY if omitted.",
    )
    parser.add_argument(
        "--systemd",
        action="store_true",
        help="After install: enable user systemd for LangGraph worker + API + web (same as --runtime systemd).",
    )
    parser.add_argument(
        "--install-os-deps",
        action="store_true",
        help="Debian/Ubuntu: sudo apt install python venv, nodejs, npm, docker when needed",
    )
    parser.add_argument(
        "--with-postgres",
        action="store_true",
        help="If Docker is available: start dev PostgreSQL and apply migrations (default on for demo profile)",
    )
    parser.add_argument(
        "--non-interactive",
        action="store_true",
        help="No prompts; use flags or defaults (profile=demo, runtime=manual)",
    )
    parser.add_argument("--skip-frontend", action="store_true", help="Do not run npm in frontend/.")
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Less installer narration (subcommands still print to the terminal).",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print steps without installing.")
    return parser.parse_args()


def resolve_config(args: argparse.Namespace) -> tuple[str, RuntimeMode, bool, bool]:
    interactive = not args.non_interactive and not args.dry_run and sys.stdin.isatty()
    profile = args.profile
    runtime: RuntimeMode | None = args.runtime  # type: ignore[assignment]
    install_os = args.install_os_deps if args.install_os_deps else None
    with_pg = args.with_postgres if args.with_postgres else None

    if interactive:
        return gather_interactive_config(
            profile=profile,
            runtime=runtime,
            install_os_deps=install_os,
            with_postgres=with_pg,
        )

    print_banner()
    prof = profile or "demo"
    rt: RuntimeMode = runtime or "manual"  # type: ignore[assignment]
    os_deps = bool(args.install_os_deps)
    pg = bool(args.with_postgres)
    if not pg and prof in ("demo", "verify"):
        pg = True
    if pg and not docker_available():
        raise SystemExit(
            "Install requires Docker for PostgreSQL (CHANGE_SOCIETY_STORE=postgresql). "
            "Install/start Docker, or re-run: bash install.sh --install-os-deps --non-interactive"
        )
    return prof, rt, os_deps, pg


def apply_runtime(
    pack: Path,
    runtime: RuntimeMode,
    *,
    dry_run: bool,
    skip_frontend: bool,
) -> None:
    if runtime == "none":
        return
    if runtime == "systemd":
        if skip_frontend:
            raise SystemExit("systemd runtime requires frontend (omit --skip-frontend).")
        install_systemd_user_units(pack, dry_run=dry_run)
        return
    if runtime == "docker":
        start_docker_compose_stack(pack, dry_run=dry_run)
        return
    base = venv_base(pack)
    py = base / ".venv" / "bin" / "python"
    detail(
        "Runtime=manual: start API + UI yourself when ready.\n"
        f"  Example API:  set -a && source .env && set +a && "
        f"PYTHONPATH=backend/change-society-service/src "
        f"{py} -m uvicorn change_society.main:app --host 127.0.0.1 --port 32500"
    )


def main() -> int:
    args = parse_args()
    if args.systemd:
        args.runtime = "systemd"
    set_verbose(not args.quiet)
    profile, runtime, install_os_deps, with_postgres = resolve_config(args)

    if profile == "production":
        print_banner()
        production_hints()
        return 0

    check_python()
    pack = pack_root()
    requirements = pack / "requirements.txt"
    if not requirements.is_file():
        requirements = pack / "backend" / "change-society-service" / "requirements.txt"
    frontend = pack / "frontend"
    env_path = pack / ".env"

    if not requirements.is_file():
        raise SystemExit(f"Missing {requirements}")

    detail(f"Pack root: {pack}")
    detail(
        f"Profile: {profile}  Runtime: {runtime}  OS deps flag: {install_os_deps}  "
        f"Postgres container: {with_postgres}  Verbose: {verbose()}"
    )

    dev_requirements = pack / "requirements-dev.txt"
    python: Path | None = None

    tasks: list[tuple[str, str, object]] = []
    os_sub = (
        "python venv / node / docker as needed"
        if install_os_deps
        else "skipped — pass --install-os-deps to run apt from install.py"
    )
    tasks.append(
        (
            "OS dependencies (apt)",
            os_sub,
            lambda: install_os_dependencies(
                install_os_deps=install_os_deps,
                runtime=runtime,
                with_postgres=with_postgres,
                skip_frontend=args.skip_frontend,
                dry_run=args.dry_run,
            ),
        )
    )

    def _venv() -> None:
        nonlocal python
        python = ensure_venv(pack, args.dry_run)
        info(f"Using venv python: {python}")

    tasks.append(("Python virtual environment", str(venv_base(pack) / ".venv"), _venv))
    tasks.append(
        (
            "Python packages",
            requirements.name,
            lambda: install_backend(python, requirements, args.dry_run, label=requirements.name),  # type: ignore[arg-type]
        )
    )
    if dev_requirements.is_file():
        tasks.append(
            (
                "Python dev packages",
                dev_requirements.name,
                lambda: install_backend(python, dev_requirements, args.dry_run, label=dev_requirements.name),  # type: ignore[arg-type]
            )
        )
    if not args.skip_frontend:
        tasks.append(
            (
                "Frontend (npm)",
                str(frontend),
                lambda: install_frontend(frontend, args.dry_run, args.skip_frontend),
            )
        )

    def _env_boot() -> None:
        ensure_demo_env(pack, env_path, args.dry_run)

    tasks.append(("Environment (.env)", "Minimum boot from .env.example", _env_boot))

    def _env_pg() -> None:
        ensure_persistence_env(env_path, dry_run=args.dry_run)
        if not args.dry_run and env_path.is_file():
            load_dotenv_into_environ(env_path)
        if os.getenv("CHANGE_SOCIETY_STORE", "").strip() == "memory" and not args.dry_run:
            raise SystemExit(
                "CHANGE_SOCIETY_STORE=memory is not supported for install; use postgresql (Docker Postgres is started by install.sh)."
            )

    tasks.append(("PostgreSQL settings", "CHANGE_SOCIETY_STORE=postgresql", _env_pg))

    if with_postgres:
        tasks.append(
            (
                "Docker PostgreSQL",
                "deployments/compose.dev-postgres.yaml",
                lambda: start_docker_postgres(pack, dry_run=args.dry_run),
            )
        )
        tasks.append(
            (
                "SQL migrations",
                "backend/change-society-service/migrations/*.sql",
                lambda: _run_migrations(args, env_path, pack, python),
            )
        )

    tasks.append(
        (
            "Runtime / process manager",
            runtime,
            lambda: apply_runtime(
                pack,
                runtime,
                dry_run=args.dry_run,
                skip_frontend=args.skip_frontend,
            ),
        )
    )
    if profile == "verify":
        tasks.append(
            (
                "Verify smoke",
                "tests/e2e/change-society/run-real-test.sh",
                lambda: run_verify(pack, args.dry_run),
            )
        )

    for i, (title, subtitle, fn) in enumerate(tasks, start=1):
        with install_step(i, len(tasks), title, subtitle=subtitle):
            fn()  # type: ignore[operator]

    detail("")
    detail(narrative_for_runtime(runtime))
    detail(
        "Install does NOT: create Qwen Cloud accounts, inject production secrets, deploy Alibaba ECS.\n"
        "See docs/07-deployment-and-operations.md for production compose."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
