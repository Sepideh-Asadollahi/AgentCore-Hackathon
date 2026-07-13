from __future__ import annotations

import shutil
from pathlib import Path

from .cmd import run_cmd


def render_systemd_unit(template: str, *, repo_root: Path, npm_path: str) -> str:
    return (
        template.replace("@REPO_ROOT@", str(repo_root))
        .replace("@NPM@", npm_path)
        .replace("@PYTHON@", str(repo_root / ".venv" / "bin" / "python"))
    )


def install_systemd_user_units(root: Path, ht: Path, *, dry_run: bool) -> None:
    npm = shutil.which("npm")
    if not npm:
        raise SystemExit("systemd runtime requires npm (frontend). Re-run without --skip-frontend.")

    unit_dir = ht / "deployments" / "systemd"
    api_tpl = (unit_dir / "change-society-api.service.template").read_text(encoding="utf-8")
    web_tpl = (unit_dir / "change-society-web.service.template").read_text(encoding="utf-8")

    user_systemd = Path.home() / ".config" / "systemd" / "user"
    user_systemd.mkdir(parents=True, exist_ok=True)

    api_unit = render_systemd_unit(api_tpl, repo_root=root, npm_path=npm)
    web_unit = render_systemd_unit(web_tpl, repo_root=root, npm_path=npm)

    api_path = user_systemd / "change-society-api.service"
    web_path = user_systemd / "change-society-web.service"

    print(f"Writing {api_path}")
    print(f"Writing {web_path}")
    if not dry_run:
        api_path.write_text(api_unit, encoding="utf-8")
        web_path.write_text(web_unit, encoding="utf-8")

    frontend = ht / "frontend"
    run_cmd([npm, "run", "build"], cwd=frontend, dry_run=dry_run)

    run_cmd(["systemctl", "--user", "daemon-reload"], dry_run=dry_run)
    run_cmd(["systemctl", "--user", "enable", "--now", "change-society-api.service"], dry_run=dry_run)
    run_cmd(["systemctl", "--user", "enable", "--now", "change-society-web.service"], dry_run=dry_run)

    print(
        "\nSystemd (user) services started.\n"
        "  Example status:  systemctl --user status change-society-api.service\n"
        "  Example logs:    journalctl --user -u change-society-api -f\n"
        "  Optional linger: loginctl enable-linger $USER  "
        "(keeps user services after logout; requires admin on some distros)"
    )
