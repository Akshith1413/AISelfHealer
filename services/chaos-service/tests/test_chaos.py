import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.main import RUNS, app


def test_chaos_run_defaults_to_safe_dry_run():
    RUNS.clear()
    client = TestClient(app)
    response = client.post("/run", json={"experiment": "pod_kill", "service_name": "data-service"})
    assert response.status_code == 202
    assert response.json()["mode"] == "dry-run"
    assert RUNS
