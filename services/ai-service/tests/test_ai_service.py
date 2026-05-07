import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.main import app


def test_detects_obvious_latency_anomaly():
    client = TestClient(app)
    payload = {
        "service_id": "data-service",
        "points": [
            {
                "p99_latency_ms": 1200,
                "error_rate": 0.12,
                "throughput_rps": 900,
                "cpu_percent": 95,
                "memory_mb": 2200,
                "db_pool_wait_ms": 300,
            }
        ],
    }
    response = client.post("/score", json=payload)
    assert response.status_code == 200
    assert response.json()["is_anomaly"] is True
    assert response.json()["severity"] in {"warning", "critical"}
