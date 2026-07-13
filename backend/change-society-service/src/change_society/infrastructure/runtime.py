from datetime import UTC, datetime
from uuid import uuid4


class SystemClock:
    def now(self) -> str:
        return datetime.now(UTC).isoformat()


class UuidGenerator:
    def new(self, prefix: str) -> str:
        return f"{prefix}_{uuid4().hex}"
