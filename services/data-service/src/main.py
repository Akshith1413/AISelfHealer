from __future__ import annotations

from uuid import uuid4

from fastapi import FastAPI, Header, HTTPException, Response
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from starlette.middleware.cors import CORSMiddleware

from .idempotency import IdempotencyStore
from .repository import MetricsRepository

app = FastAPI(title="NeuralMesh Data Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

REQUEST_COUNT = Counter("data_service_http_requests_total", "Total requests", ["method", "endpoint", "status"])
REQUEST_LATENCY = Histogram("data_service_http_request_duration_seconds", "Request latency", ["endpoint"])
ACTIVE_CONNECTIONS = Gauge("data_service_active_connections", "Active connections")

repo = MetricsRepository()
idempotency = IdempotencyStore()


class MetricCommand(BaseModel):
    service_id: str
    p99_latency_ms: float = Field(ge=0)
    error_rate: float = Field(ge=0, le=1)
    throughput_rps: float = Field(ge=0)
    cpu_percent: float = Field(ge=0, le=100)
    memory_mb: float = Field(ge=0)
    gc_pause_ms: float = Field(default=0, ge=0)
    db_pool_wait_ms: float = Field(default=0, ge=0)
    request_count: int = Field(default=0, ge=0)
    recorded_at: str | None = None


@app.middleware("http")
async def metrics_middleware(request, call_next):
    ACTIVE_CONNECTIONS.inc()
    with REQUEST_LATENCY.labels(endpoint=request.url.path).time():
        response = await call_next(request)
    REQUEST_COUNT.labels(method=request.method, endpoint=request.url.path, status=response.status_code).inc()
    ACTIVE_CONNECTIONS.dec()
    return response


def tenant_id(header: str | None) -> str:
    return header or "tenant-demo"


@app.get("/health")
async def health():
    return {"status": "ok", "service": "data-service"}


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/commands/service-metrics", status_code=201)
async def create_metric(
    command: MetricCommand,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    x_tenant_id: str | None = Header(default=None),
    x_request_id: str | None = Header(default=None),
):
    cached = idempotency.get(idempotency_key)
    if cached:
        return {**cached, "idempotent_replay": True}
    result = repo.write_metric(tenant_id(x_tenant_id), command.model_dump(), x_request_id or str(uuid4()))
    response = {"status": "written", **result}
    idempotency.set(idempotency_key, response)
    return response


@app.get("/queries/service-metrics")
async def query_metrics(
    service_id: str | None = None,
    limit: int = 100,
    x_tenant_id: str | None = Header(default=None),
):
    return {"metrics": repo.list_metrics(tenant_id(x_tenant_id), service_id=service_id, limit=limit)}


@app.get("/queries/service-metrics/{service_id}/rollup")
async def query_rollup(service_id: str, x_tenant_id: str | None = Header(default=None)):
    rows = [row for row in repo.hourly_rollup(tenant_id(x_tenant_id)) if row["service_id"] == service_id]
    if not rows:
        raise HTTPException(status_code=404, detail="No metrics for service")
    return {"rollup": rows}


@app.get("/events/replay")
async def replay(x_tenant_id: str | None = Header(default=None)):
    return {"events": repo.replay_events(tenant_id(x_tenant_id))}


@app.get("/registry")
async def registry():
    return {
        "service_id": "data-service",
        "url": "http://data-service:8001",
        "endpoints": ["/commands/service-metrics", "/queries/service-metrics", "/events/replay", "/health", "/metrics"],
        "heartbeat_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }

