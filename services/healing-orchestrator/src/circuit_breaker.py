from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta


@dataclass
class CircuitBreaker:
    service_id: str
    state: str = "closed"
    failures: int = 0
    successes: int = 0
    opened_at: datetime | None = None
    threshold: int = 3
    cooldown_seconds: int = 30

    def record_failure(self) -> str:
        self.failures += 1
        self.successes = 0
        if self.failures >= self.threshold:
            self.state = "open"
            self.opened_at = datetime.now(UTC)
        return self.state

    def record_success(self) -> str:
        if self.state == "half_open":
            self.successes += 1
            if self.successes >= 3:
                self.state = "closed"
                self.failures = 0
                self.successes = 0
                self.opened_at = None
        elif self.state == "closed":
            self.failures = 0
        return self.state

    def tick(self) -> str:
        if self.state == "open" and self.opened_at and datetime.now(UTC) - self.opened_at >= timedelta(seconds=self.cooldown_seconds):
            self.state = "half_open"
            self.successes = 0
        return self.state

    def to_dict(self) -> dict:
        return {
            "service_id": self.service_id,
            "state": self.state,
            "failures": self.failures,
            "successes": self.successes,
            "opened_at": self.opened_at.isoformat() if self.opened_at else None,
        }

