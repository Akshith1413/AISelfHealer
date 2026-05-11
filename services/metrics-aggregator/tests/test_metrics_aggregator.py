import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src import main


def test_aggregator_tracks_window(monkeypatch):
    async def fake_score(service_id, tenant_id, points):
        return {"service_id": service_id, "is_anomaly": False, "severity": "normal"}

    monkeypatch.setattr(main, "score_with_ai", fake_score)
    main.WINDOWS.clear()
    client = TestClient(main.app)
    response = client.post("/telemetry", json={"service_id": "api-gateway", "p99_latency_ms": 100})
    assert response.status_code == 202
    assert response.json()["window_size"] == 1
