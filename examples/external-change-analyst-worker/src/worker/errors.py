from __future__ import annotations


class WorkerUpstreamError(RuntimeError):
    """Maps upstream LLM failures to webhook HTTP responses the control plane can interpret."""

    def __init__(self, code: str, message: str, *, http_status: int = 502):
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status
