#!/usr/bin/env python3
"""Minimal Qwen compatible-mode smoke (loads hackathon/.env). Stdlib only — no httpx."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ENV = Path(__file__).resolve().parents[1] / ".env"
if ENV.is_file():
    for raw in ENV.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v

key = (os.getenv("QWEN_API_KEY") or "").strip()
if not key:
    print("FAIL: QWEN_API_KEY empty in hackathon/.env")
    raise SystemExit(1)

base = (os.getenv("QWEN_BASE_URL") or "https://dashscope-intl.aliyuncs.com/compatible-mode/v1").rstrip("/")
model = os.getenv("QWEN_MODEL") or "qwen-flash"
payload = json.dumps(
    {
        "model": model,
        "messages": [{"role": "user", "content": "Reply with exactly one word: Hello"}],
        "max_tokens": 20,
        "temperature": 0,
    },
    separators=(",", ":"),
).encode("utf-8")

req = urllib.request.Request(
    f"{base}/chat/completions",
    data=payload,
    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    method="POST",
)

try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        status = resp.status
        raw = resp.read().decode("utf-8", errors="replace")
except urllib.error.HTTPError as exc:
    status = exc.code
    raw = exc.read().decode("utf-8", errors="replace")
except urllib.error.URLError as exc:
    print(f"FAIL: request error: {exc.reason}")
    raise SystemExit(2) from exc

print(f"HTTP {status}")
if status != 200:
    print("FAIL: response excerpt:", raw[:400])
    raise SystemExit(3)

data = json.loads(raw)
content = (data.get("choices") or [{}])[0].get("message", {}).get("content", "")
usage = data.get("usage") or {}
print("OK model:", data.get("model") or model)
print("OK reply:", content.strip()[:200])
print("OK tokens:", usage.get("prompt_tokens"), "/", usage.get("completion_tokens"))
