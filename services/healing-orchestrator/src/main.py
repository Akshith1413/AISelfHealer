from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from fastapi import FastAPI, Response
from pydantic import BaseModel
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, generate_latest
from starlette.middleware.cors import CORSMiddleware

from .circuit_breaker import CircuitBreaker
from .state import RerouteStore

app = FastAPI(title="NeuralMesh Healing Orchestrator", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

breakers: dict[str, CircuitBreaker] = {}
reroutes = RerouteStore()
events: list[dict] = []

HEALING_COUNTER = Counter("healing_orchestrator_actions_total", "Healing actions", ["action", "status"])
CIRCUIT_STATE = Gauge("healing_orchestrator_circuit_state", "Circuit state numeric", ["service_id"])


class AnomalyEvent(BaseModel):
    service_id: str
    tenant_id: str = "tenant-demo"
    severity: str = "warning"
    recommended_action: str = "open_circuit"
    anomaly_type: str = "unknown"
    correlation_id: str | None = None


class ScaleEvent(BaseModel):
    service_id: str
    predicted_rps: float
    recommended_replicas: int
    current_replicas: int = 1


def breaker_for(service_id: str) -> CircuitBreaker:
    breakers.setdefault(service_id, CircuitBreaker(service_id=service_id))
    return breakers[service_id]


def record_event(event_type: str, service_id: str, payload: dict, correlation_id: str | None = None) -> dict:
    event = {
        "event_id": f"event_{uuid4()}",
        "event_type": event_type,
        "service_id": service_id,
        "tenant_id": payload.get("tenant_id", "tenant-demo"),
        "payload": payload,
        "timestamp": datetime.now(UTC).isoformat(),
        "causation_id": payload.get("event_id"),
        "correlation_id": correlation_id or f"incident_{uuid4()}",
    }
    events.insert(0, event)
    events[:] = events[:250]
    return event


@app.get("/health")
async def health():
    return {"status": "ok", "service": "healing-orchestrator"}


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/events/anomaly", status_code=202)
async def handle_anomaly(event: AnomalyEvent):
    breaker = breaker_for(event.service_id)
    breaker.record_failure()
    CIRCUIT_STATE.labels(service_id=event.service_id).set({"closed": 0, "half_open": 1, "open": 2}[breaker.state])
    started = record_event("healing.started", event.service_id, event.model_dump(), event.correlation_id)
    action = "observe"

    if event.severity == "critical" or event.recommended_action == "restart_or_reroute":
        action = "restart_container"
        reroutes.set_reroute(event.service_id, "cached-fallback")
    elif event.recommended_action == "open_circuit":
        action = "open_circuit"
    HEALING_COUNTER.labels(action=action, status="started").inc()

    completed = record_event(
        "healing.complete",
        event.service_id,
        {
            **event.model_dump(),
            "action": action,
            "before": "degraded",
            "after": "healthy" if action == "restart_container" else "guarded",
            "circuit": breaker.to_dict(),
            "recovery_seconds": 18 if action == "restart_container" else 3,
        },
        started["correlation_id"],
    )
    HEALING_COUNTER.labels(action=action, status="complete").inc()
    return {"status": "healed", "started": started, "completed": completed, "reroute": reroutes.get(event.service_id)}


@app.post("/scale", status_code=202)
async def scale(event: ScaleEvent):
    payload = event.model_dump()
    payload["action"] = "scale_deployment"
    payload["applied_replicas"] = max(event.current_replicas, event.recommended_replicas)
    recorded = record_event("scale.event", event.service_id, payload)
    return {"status": "accepted", "event": recorded}


@app.post("/circuit/{service_id}/success")
async def circuit_success(service_id: str):
    breaker = breaker_for(service_id)
    breaker.tick()
    state = breaker.record_success()
    return breaker.to_dict() | {"state": state}


@app.post("/circuit/{service_id}/failure")
async def circuit_failure(service_id: str):
    breaker = breaker_for(service_id)
    state = breaker.record_failure()
    return breaker.to_dict() | {"state": state}


@app.get("/circuit/{service_id}")
async def circuit(service_id: str):
    breaker = breaker_for(service_id)
    breaker.tick()
    return breaker.to_dict() | {"reroute": reroutes.get(service_id)}


@app.get("/events")
async def list_events():
    return {"events": events}

