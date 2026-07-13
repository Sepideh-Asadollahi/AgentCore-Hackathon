from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

RuntimeMode = Literal["manual", "systemd", "docker", "none"]


@dataclass(frozen=True)
class ChoiceOption:
    key: str
    title: str
    example: str
