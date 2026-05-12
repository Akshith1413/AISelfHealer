import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.main import app, completed, failed, queues


def test_priority_job_processing():
    for queue in queues.values():
        queue.clear()
    completed.clear()
    failed.clear()
    client = TestClient(app)
    client.post("/workers/jobs", json={"kind": "report", "priority": "low"})
    client.post("/workers/jobs", json={"kind": "data_export", "priority": "high"})
    processed = client.post("/workers/tick").json()
    assert processed["job"]["priority"] == "high"
    assert processed["status"] == "processed"
