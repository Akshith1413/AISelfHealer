from __future__ import annotations

from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Response
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.middleware.cors import CORSMiddleware

from .anomaly import AnomalyDetector
from .grpc_runtime import start_grpc_server
from .model_registry import drift_report, registry_payload
from .rca import root_cause
from .scaling import predict_replicas

DETECTOR = AnomalyDetector()
SCORES = Counter("ai_service_scores_total", "Inference count", ["severity"])
LATENCY = Histogram("ai_service_inference_duration_seconds", "Inference latency")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    start_grpc_server(DETECTOR)
    yield


app = FastAPI(title="NeuralMesh AI Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class MetricPoint(BaseModel):
    p99_latency_ms: float = 0
    error_rate: float = 0
    throughput_rps: float = 0
    cpu_percent: float = 0
    memory_mb: float = 0
    gc_pause_ms: float = 0
    db_pool_wait_ms: float = 0


class ScoreRequest(BaseModel):
    service_id: str
    tenant_id: str = "tenant-demo"
    points: list[MetricPoint] = Field(min_length=1)


class ScaleRequest(BaseModel):
    service_id: str
    current_replicas: int = 1
    history: list[MetricPoint] = Field(default_factory=list)


class RootCauseRequest(BaseModel):
    service_id: str
    traces: list[dict] = Field(default_factory=list)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-service"}


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/score")
async def score(request: ScoreRequest):
    with LATENCY.time():
        result = DETECTOR.score_window(request.service_id, [point.model_dump() for point in request.points])
    SCORES.labels(severity=result.severity).inc()
    return {
        "event_id": f"score_{uuid4()}",
        "tenant_id": request.tenant_id,
        **result.__dict__,
    }


@app.post("/predict-scale")
async def predict_scale(request: ScaleRequest):
    return {
        "service_id": request.service_id,
        **predict_replicas([point.model_dump() for point in request.history], request.current_replicas),
    }


@app.post("/root-cause")
async def analyze_root_cause(request: RootCauseRequest):
    return root_cause(request.service_id, request.traces)


@app.get("/models")
async def models():
    return registry_payload()


@app.post("/drift")
async def drift(payload: dict):
    return drift_report(payload.get("predictions", []))
