#!/usr/bin/env python3
"""Run the external Change Analyst worker (uvicorn)."""

from __future__ import annotations

import uvicorn

from worker.settings import Settings


def main() -> None:
    settings = Settings.load()
    uvicorn.run(
        "worker.main:create_app",
        host=settings.host,
        port=settings.port,
        factory=True,
        reload=False,
        log_level=settings.log_level,
    )


if __name__ == "__main__":
    main()
