from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any


@dataclass
class IdempotencyRecord:
    response: dict[str, Any]
    expires_at: float


class IdempotencyStore:
    def __init__(self, ttl_seconds: int = 24 * 60 * 60) -> None:
        self.ttl_seconds = ttl_seconds
        self._records: dict[str, IdempotencyRecord] = {}

    def get(self, key: str | None) -> dict[str, Any] | None:
        if not key:
            return None
        record = self._records.get(key)
        if not record:
            return None
        if record.expires_at <= time.time():
            self._records.pop(key, None)
            return None
        return record.response

    def set(self, key: str | None, response: dict[str, Any]) -> None:
        if key:
            self._records[key] = IdempotencyRecord(response=response, expires_at=time.time() + self.ttl_seconds)

