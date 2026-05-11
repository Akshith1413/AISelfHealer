from __future__ import annotations

import os
from collections import defaultdict, deque
from uuid import uuid4

import httpx
from fastapi import FastAPI, Response
from pydantic import BaseModel
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, generate_latest
from starlette.middleware.cors import CORSMiddleware

app = FastAPI(title="NeuralMesh Metrics Aggregator", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

WINDOWS: dict[str, deque[dict]] = defaultdict(lambda: deque(maxlen=60))
RAW_COUNTER = Counter("metrics_aggregator_raw_total", "Raw telemetry received", ["service_id"])
ANOMALY_COUNTER = Counter("metrics_aggregator_anomalies_total", "Anomalies emitted", ["service_id", "severity"])
WINDOW_SIZE = Gauge("metrics_aggregator_window_size", "Current sliding window size", ["service_id"])


class Telemetry(BaseModel):
    service_id: str
    tenant_id: str = "tenant-demo"
    p99_latency_ms: float = 0
    error_rate: float = 0
    throughput_rps: float = 0
    cpu_percent: float = 0
    memory_mb: float = 0
    gc_pause_ms: float = 0
    db_pool_wait_ms: float = 0


async def score_with_ai(service_id: str, tenant_id: str, points: list[dict]) -> dict:
    ai_url = os.getenv("AI_SERVICE_URL", "http://localhost:8003")
    async with httpx.AsyncClient(timeout=3.0) as client:
        response = await client.post(f"{ai_url}/score", json={"service_id": service_id, "tenant_id": tenant_id, "points": points})
        response.raise_for_status()
        return response.json()


@app.get("/health")
async def health():
    return {"status": "ok", "service": "metrics-aggregator"}


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/telemetry", status_code=202)
async def ingest(telemetry: Telemetry):
    point = telemetry.model_dump()
    window = WINDOWS[telemetry.service_id]
    window.append(point)
    RAW_COUNTER.labels(service_id=telemetry.service_id).inc()
    WINDOW_SIZE.labels(service_id=telemetry.service_id).set(len(window))
    score = await score_with_ai(telemetry.service_id, telemetry.tenant_id, list(window))
    event = None
    if score.get("is_anomaly"):
        ANOMALY_COUNTER.labels(service_id=telemetry.service_id, severity=score.get("severity", "unknown")).inc()
        event = {
            "event_id": f"event_{uuid4()}",
            "event_type": "anomaly.detected",
            "service_id": telemetry.service_id,
            "tenant_id": telemetry.tenant_id,
            "payload": score,
            "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
            "causation_id": score.get("event_id"),
            "correlation_id": f"incident_{uuid4()}",
        }
    return {"status": "accepted", "window_size": len(window), "score": score, "event": event}


@app.get("/windows")
async def windows():
    return {"windows": {service_id: list(points) for service_id, points in WINDOWS.items()}}

