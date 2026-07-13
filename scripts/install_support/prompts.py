from __future__ import annotations

from .types import ChoiceOption


def prompt_choice(
    prompt: str,
    options: tuple[ChoiceOption, ...],
    *,
    default_key: str,
    allow_empty: bool = True,
) -> str:
    """Interactive numbered menu with a visible example per option."""
    print(f"\n{prompt}\n")
    keys = {o.key: o for o in options}
    default = keys.get(default_key)
    if default is None:
        raise ValueError(f"unknown default_key {default_key!r}")
    for idx, opt in enumerate(options, start=1):
        mark = " (default)" if opt.key == default_key else ""
        print(f"  [{idx}] {opt.key}{mark} — {opt.title}")
        for line in opt.example.strip().splitlines():
            print(f"        e.g. {line}")
    while True:
        raw = input(f"\nEnter 1–{len(options)} or key [{default_key}]: ").strip()
        if not raw and allow_empty:
            return default_key
        if raw.isdigit():
            n = int(raw)
            if 1 <= n <= len(options):
                return options[n - 1].key
        if raw in keys:
            return raw
        print(f"  Invalid choice. Example: press Enter for '{default_key}' or type 2 for systemd.")


def prompt_yes_no(question: str, *, default: bool, example_yes: str, example_no: str) -> bool:
    hint = "Y/n" if default else "y/N"
    print(f"\n{question}")
    print(f"  If yes, e.g. {example_yes}")
    print(f"  If no,  e.g. {example_no}")
    while True:
        raw = input(f"Your choice [{hint}]: ").strip().lower()
        if not raw:
            return default
        if raw in ("y", "yes"):
            return True
        if raw in ("n", "no"):
            return False
        print("  Please answer y or n. Example: n  (skip OS packages, install manually later)")
