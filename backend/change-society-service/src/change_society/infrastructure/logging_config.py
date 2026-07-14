from __future__ import annotations

import logging
import os


def setup_logging() -> None:
    level_name = os.getenv("CHANGE_SOCIETY_LOG_LEVEL", "DEBUG").upper()
    level = getattr(logging, level_name, logging.DEBUG)
    root = logging.getLogger()
    if root.handlers:
        root.setLevel(level)
    else:
        logging.basicConfig(
            level=level,
            format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        )
    for name in (
        "change_society",
        "change_society.api",
        "change_society.http",
        "change_society.service",
        "change_society.control_plane",
        "change_society.model",
        "uvicorn",
        "uvicorn.error",
        "uvicorn.access",
    ):
        logging.getLogger(name).setLevel(level)
    logging.getLogger(__name__).debug("logging configured level=%s", level_name)
