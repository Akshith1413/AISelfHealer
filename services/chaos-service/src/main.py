from __future__ import annotations

import os
import random
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import FastAPI, Response
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest
from starlette.middleware.cors import CORSMiddleware

app = FastAPI(title="NeuralMesh Chaos Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

RUNS: list[dict] = []
CHAOS_COUNTER = Counter("chaos_service_experiments_total", "Chaos experiments", ["experiment", "mode"])

EXPERIMENTS = {
    "pod_kill": "Randomly kills a service container to test restart and detection.",
    "network_latency": "Adds 500ms-2000ms delay to a service.",
    "network_partition": "Blocks traffic between two services.",
    "cpu_stress": "Saturates CPU to exercise autoscaling.",
    "memory_leak": "Allocates memory pressure until OOM path would trigger.",
    "kafka_partition_loss": "Simulates unavailable Kafka partition.",
    "db_connection_exhaustion": "Fills a database connection pool.",
    "dns_failure": "Breaks service discovery for one service.",
}


class ChaosRun(BaseModel):
    experiment: str = Field(pattern="^(pod_kill|network_latency|network_partition|cpu_stress|memory_leak|kafka_partition_loss|db_connection_exhaustion|dns_failure)$")
    service_name: str | None = None
    delay_ms: int = 1000
    duration_s: int = 10
    dry_run: bool = True


@app.get("/health")
async def health():
    return {"status": "ok", "service": "chaos-service"}


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/experiments")
async def experiments():
    return {"experiments": [{"name": name, "description": description} for name, description in EXPERIMENTS.items()]}


@app.post("/run", status_code=202)
async def run(request: ChaosRun):
    destructive_allowed = os.getenv("CHAOS_ALLOW_DESTRUCTIVE", "false").lower() == "true"
    dry_run = request.dry_run or not destructive_allowed
    target = request.service_name or random.choice(["data-service", "worker-service", "ai-service", "notification-service"])
    record = {
        "id": f"chaos_{uuid4()}",
        "experiment": request.experiment,
        "service_name": target,
        "mode": "dry-run" if dry_run else "active",
        "parameters": request.model_dump(),
        "started_at": datetime.now(UTC).isoformat(),
        "status": "completed" if dry_run else "started",
        "result": f"{request.experiment} simulated for {target}" if dry_run else f"{request.experiment} started for {target}",
    }
    RUNS.insert(0, record)
    RUNS[:] = RUNS[:100]
    CHAOS_COUNTER.labels(experiment=request.experiment, mode=record["mode"]).inc()
    return record


@app.get("/runs")
async def runs():
    return {"runs": RUNS}

