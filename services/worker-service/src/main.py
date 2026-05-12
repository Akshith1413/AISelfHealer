from __future__ import annotations

from collections import deque
from datetime import UTC, datetime, timedelta
from enum import Enum
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, generate_latest
from starlette.middleware.cors import CORSMiddleware

app = FastAPI(title="NeuralMesh Worker Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

JOB_COUNTER = Counter("worker_service_jobs_total", "Jobs submitted", ["priority", "status"])
QUEUE_DEPTH = Gauge("worker_service_queue_depth", "Queue depth", ["priority"])


class Priority(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class JobRequest(BaseModel):
    kind: str = Field(pattern="^(report|bulk_email|data_export|webhook)$")
    payload: dict = Field(default_factory=dict)
    priority: Priority = Priority.medium
    max_retries: int = 3


queues: dict[Priority, deque[dict]] = {
    Priority.high: deque(),
    Priority.medium: deque(),
    Priority.low: deque(),
}
active: dict[str, dict] = {}
failed: list[dict] = []
completed: list[dict] = []


def sync_depths() -> None:
    for priority, queue in queues.items():
        QUEUE_DEPTH.labels(priority=priority.value).set(len(queue))


def enqueue(job: dict) -> dict:
    queues[Priority(job["priority"])].append(job)
    JOB_COUNTER.labels(priority=job["priority"], status="queued").inc()
    sync_depths()
    return job


@app.get("/health")
async def health():
    return {"status": "ok", "service": "worker-service"}


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/workers/jobs", status_code=201)
async def submit_job(request: JobRequest):
    now = datetime.now(UTC).isoformat()
    return enqueue({
        "id": f"job_{uuid4()}",
        "kind": request.kind,
        "payload": request.payload,
        "priority": request.priority.value,
        "attempts": 0,
        "max_retries": request.max_retries,
        "status": "queued",
        "next_run_at": now,
        "created_at": now,
        "updated_at": now,
    })


@app.post("/workers/tick")
async def process_one():
    sync_depths()
    selected = None
    for priority in (Priority.high, Priority.medium, Priority.low):
        if queues[priority]:
            selected = queues[priority].popleft()
            break
    if not selected:
        return {"status": "idle"}

    selected["attempts"] += 1
    selected["status"] = "active"
    active[selected["id"]] = selected
    try:
        if selected["payload"].get("force_fail"):
            raise RuntimeError("forced failure for retry path")
        selected["status"] = "completed"
        selected["updated_at"] = datetime.now(UTC).isoformat()
        completed.insert(0, selected)
        JOB_COUNTER.labels(priority=selected["priority"], status="completed").inc()
        return {"status": "processed", "job": selected}
    except Exception as exc:
        selected["last_error"] = str(exc)
        selected["updated_at"] = datetime.now(UTC).isoformat()
        if selected["attempts"] <= selected["max_retries"]:
            delay = 2 ** selected["attempts"]
            selected["status"] = "retry_scheduled"
            selected["next_run_at"] = (datetime.now(UTC) + timedelta(seconds=delay)).isoformat()
            queues[Priority(selected["priority"])].append(selected)
            JOB_COUNTER.labels(priority=selected["priority"], status="retry").inc()
            return {"status": "retry_scheduled", "job": selected, "delay_seconds": delay}
        selected["status"] = "dead_lettered"
        failed.insert(0, selected)
        JOB_COUNTER.labels(priority=selected["priority"], status="dead_lettered").inc()
        return {"status": "dead_lettered", "job": selected}
    finally:
        active.pop(selected["id"], None)
        sync_depths()


@app.get("/workers/status")
async def status():
    sync_depths()
    return {
        "queue_depth": {priority.value: len(queue) for priority, queue in queues.items()},
        "active_workers": len(active),
        "failed_jobs": failed[:25],
        "completed_jobs": completed[:25],
    }


@app.get("/workers/jobs/{job_id}")
async def get_job(job_id: str):
    for collection in [active.values(), failed, completed, *queues.values()]:
        for job in collection:
            if job["id"] == job_id:
                return job
    raise HTTPException(status_code=404, detail="Job not found")
