from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any


SENSITIVE_KEYS = {"password", "secret", "token", "authorization"}


def redact(payload: dict[str, Any]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in payload.items():
        if key.lower() in SENSITIVE_KEYS:
            result[key] = "[REDACTED]"
        elif isinstance(value, dict):
            result[key] = redact(value)
        else:
            result[key] = value
    return result


def setup_logging() -> logging.Logger:
    logger = logging.getLogger("tradebridge-windows-agent")
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()

    class JsonFormatter(logging.Formatter):
        def format(self, record: logging.LogRecord) -> str:
            payload = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "level": record.levelname,
                "message": record.getMessage(),
            }
            if hasattr(record, "payload"):
                payload["payload"] = redact(getattr(record, "payload"))
            return json.dumps(payload)

    handler.setFormatter(JsonFormatter())
    logger.handlers = [handler]
    return logger
