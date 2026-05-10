import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.main import app, repo


def test_idempotent_metric_write_and_query():
    repo.write_model.clear()
    repo.read_model.clear()
    repo.events.clear()
    client = TestClient(app)
    payload = {
        "service_id": "data-service",
        "p99_latency_ms": 123,
        "error_rate": 0.02,
        "throughput_rps": 55,
        "cpu_percent": 42,
        "memory_mb": 512,
        "request_count": 10,
    }
    first = client.post("/commands/service-metrics", json=payload, headers={"Idempotency-Key": "abc", "X-Tenant-ID": "tenant-a"})
    second = client.post("/commands/service-metrics", json=payload, headers={"Idempotency-Key": "abc", "X-Tenant-ID": "tenant-a"})
    assert first.status_code == 201
    assert second.json()["idempotent_replay"] is True
    assert len(repo.write_model) == 1
    listed = client.get("/queries/service-metrics", headers={"X-Tenant-ID": "tenant-a"})
    assert listed.json()["metrics"][0]["service_id"] == "data-service"
