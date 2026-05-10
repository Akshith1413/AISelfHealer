import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.main import app, breakers, events


def test_critical_anomaly_creates_healing_event_and_reroute():
    breakers.clear()
    events.clear()
    client = TestClient(app)
    response = client.post("/events/anomaly", json={"service_id": "data-service", "severity": "critical", "recommended_action": "restart_or_reroute"})
    assert response.status_code == 202
    payload = response.json()
    assert payload["completed"]["event_type"] == "healing.complete"
    assert payload["reroute"]["target"] == "cached-fallback"
