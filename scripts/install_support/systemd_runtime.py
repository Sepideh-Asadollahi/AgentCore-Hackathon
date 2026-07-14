from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

from .install_log import detail, info, run_subprocess


def _python_for_pack(pack: Path) -> Path:
    import sys

    sys_path = pack / "scripts"
    if str(sys_path) not in sys.path:
        sys.path.insert(0, str(sys_path))
    from pack_paths import venv_base  # noqa: WPS433 — install-time only

    base = venv_base(pack)
    py = base / ".venv" / "bin" / "python"
    if not py.is_file():
        raise SystemExit(f"Missing {py}. Run bash install.sh before --runtime systemd.")
    return py


def _webhook_secret_from_env(pack: Path) -> str:
    env_path = pack / ".env"
    default = "integrator-demo-secret-change-me"
    if not env_path.is_file():
        return default
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line.startswith("CHANGE_SOCIETY_WEBHOOK_AGENT_SECRET="):
            value = line.split("=", 1)[1].strip()
            return value or default
    return default


def render_systemd_unit(template: str, *, pack_root: Path, npm_path: str, python: Path, worker_pythonpath: str, webhook_secret: str) -> str:
    return (
        template.replace("@PACK_ROOT@", str(pack_root))
        .replace("@NPM@", npm_path)
        .replace("@PYTHON@", str(python))
        .replace("@WORKER_PYTHONPATH@", worker_pythonpath)
        .replace("@WEBHOOK_SECRET@", webhook_secret)
    )


def install_systemd_user_units(pack: Path, *, dry_run: bool) -> None:
    npm = shutil.which("npm")
    if not npm:
        raise SystemExit("systemd runtime requires npm (frontend). Re-run without --skip-frontend.")

    python = _python_for_pack(pack)
    worker_dir = pack / "examples" / "external-change-analyst-worker"
    backend_src = pack / "backend" / "change-society-service" / "src"
    sdk = pack / "sdk" / "python"
    worker_pythonpath = ":".join(
        str(p) for p in (worker_dir / "src", backend_src, sdk) if p.is_dir()
    )
    webhook_secret = _webhook_secret_from_env(pack)

    unit_dir = pack / "deployments" / "systemd"
    api_tpl = (unit_dir / "change-society-api.service.template").read_text(encoding="utf-8")
    web_tpl = (unit_dir / "change-society-web.service.template").read_text(encoding="utf-8")
    worker_tpl_path = unit_dir / "change-society-langgraph-worker.service.template"
    worker_tpl = worker_tpl_path.read_text(encoding="utf-8") if worker_tpl_path.is_file() else ""

    user_systemd = Path.home() / ".config" / "systemd" / "user"
    user_systemd.mkdir(parents=True, exist_ok=True)

    render_kw = {
        "pack_root": pack,
        "npm_path": npm,
        "python": python,
        "worker_pythonpath": worker_pythonpath,
        "webhook_secret": webhook_secret,
    }
    api_unit = render_systemd_unit(api_tpl, **render_kw)
    web_unit = render_systemd_unit(web_tpl, **render_kw)

    api_path = user_systemd / "change-society-api.service"
    web_path = user_systemd / "change-society-web.service"
    worker_path = user_systemd / "change-society-langgraph-worker.service"

    detail(f"Writing user systemd units under {user_systemd}")
    info(f"  {api_path.name}")
    info(f"  {web_path.name}")
    if worker_tpl:
        info(f"  {worker_path.name}")
    if not dry_run:
        api_path.write_text(api_unit, encoding="utf-8")
        web_path.write_text(web_unit, encoding="utf-8")
        if worker_tpl:
            worker_unit = render_systemd_unit(worker_tpl, **render_kw)
            worker_path.write_text(worker_unit, encoding="utf-8")

    frontend = pack / "frontend"
    detail("Building production frontend (npm run build)…")
    npm_cmd = [npm, "run", "build"]
    run_subprocess(npm_cmd, cwd=frontend, dry_run=dry_run, label="npm run build")

    run_subprocess(["systemctl", "--user", "daemon-reload"], dry_run=dry_run, label="systemctl --user daemon-reload")

    units = []
    if worker_tpl:
        units.append("change-society-langgraph-worker.service")
    units.extend(["change-society-api.service", "change-society-web.service"])
    for unit in units:
        detail(f"Enabling and starting {unit}…")
        run_subprocess(
            ["systemctl", "--user", "enable", "--now", unit],
            dry_run=dry_run,
            label=f"systemctl --user enable --now {unit}",
        )

    if not dry_run:
        try:
            subprocess.run(
                ["loginctl", "enable-linger", os.environ.get("USER", "")],
                check=False,
                capture_output=True,
            )
            info("Attempted loginctl enable-linger (keeps user services after logout).")
        except OSError:
            pass

    detail(
        "\nSystemd (user) stack started.\n"
        "  API:    http://127.0.0.1:32500/health  (CHANGE_SOCIETY_API_HOST in .env)\n"
        "  UI:     http://127.0.0.1:32501  (next start -p 32501)\n"
        "  Worker: http://127.0.0.1:32510/ready  (set QWEN_API_KEY in .env for live LLM)\n"
        "  Status: systemctl --user status change-society-api.service\n"
        "  Logs:   journalctl --user -u change-society-api -f\n"
        "  Linger: loginctl enable-linger $USER  (optional; survives logout)"
    )
