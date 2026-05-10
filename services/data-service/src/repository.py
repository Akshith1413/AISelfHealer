from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime
from statistics import mean
from typing import Any
from uuid import uuid4


class MetricsRepository:
    """CQRS-style in-memory repository used locally and in tests.

    Docker deployments can replay the same event contract into PostgreSQL/TimescaleDB via
    infrastructure/postgres/init.sql. Keeping the service repository thin makes that swap direct.
    """

    def __init__(self) -> None:
        self.write_model: list[dict[str, Any]] = []
        self.read_model: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self.events: list[dict[str, Any]] = []

    def write_metric(self, tenant_id: str, payload: dict[str, Any], correlation_id: str) -> dict[str, Any]:
        now = datetime.now(UTC).isoformat()
        metric = {
            "id": f"metric_{uuid4()}",
            "tenant_id": tenant_id,
            "service_id": payload["service_id"],
            "p99_latency_ms": float(payload.get("p99_latency_ms", 0)),
            "error_rate": float(payload.get("error_rate", 0)),
            "throughput_rps": float(payload.get("throughput_rps", 0)),
            "cpu_percent": float(payload.get("cpu_percent", 0)),
            "memory_mb": float(payload.get("memory_mb", 0)),
            "gc_pause_ms": float(payload.get("gc_pause_ms", 0)),
            "db_pool_wait_ms": float(payload.get("db_pool_wait_ms", 0)),
            "request_count": int(payload.get("request_count", 0)),
            "recorded_at": payload.get("recorded_at") or now,
            "created_at": now,
            "updated_at": now,
            "deleted_at": None,
        }
        self.write_model.append(metric)
        self.read_model[tenant_id].append(metric)
        event = {
            "event_id": f"event_{uuid4()}",
            "event_type": "metrics.raw",
            "service_id": metric["service_id"],
            "tenant_id": tenant_id,
            "payload": metric,
            "timestamp": now,
            "causation_id": None,
            "correlation_id": correlation_id,
        }
        self.events.append(event)
        return {"metric": metric, "event": event}

    def list_metrics(self, tenant_id: str, service_id: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
        rows = [row for row in self.read_model.get(tenant_id, []) if not service_id or row["service_id"] == service_id]
        return rows[-limit:][::-1]

    def hourly_rollup(self, tenant_id: str) -> list[dict[str, Any]]:
        grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
        for row in self.read_model.get(tenant_id, []):
            hour = row["recorded_at"][:13] + ":00:00"
            grouped[(row["service_id"], hour)].append(row)
        return [
            {
                "service_id": service_id,
                "hour": hour,
                "avg_p99": mean(row["p99_latency_ms"] for row in rows),
                "max_p99": max(row["p99_latency_ms"] for row in rows),
                "avg_error_rate": mean(row["error_rate"] for row in rows),
                "total_requests": sum(row["request_count"] for row in rows),
            }
            for (service_id, hour), rows in grouped.items()
        ]

    def replay_events(self, tenant_id: str) -> list[dict[str, Any]]:
        return [event for event in self.events if event["tenant_id"] == tenant_id]

