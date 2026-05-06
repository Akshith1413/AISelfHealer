from __future__ import annotations

import json
import random
import urllib.request


def post_json(url: str, payload: dict) -> None:
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"content-type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=5) as response:
        print(response.status, response.read().decode()[:200])


def main() -> None:
    services = ["api-gateway", "auth-service", "user-service", "data-service", "worker-service", "ai-service"]
    for index in range(30):
        service = random.choice(services)
        anomaly = index % 11 == 0 and service == "data-service"
        payload = {
            "service_id": service,
            "p99_latency_ms": random.randint(80, 180) if not anomaly else random.randint(650, 1200),
            "error_rate": round(random.random() * 0.02 if not anomaly else 0.09, 4),
            "throughput_rps": random.randint(40, 320),
            "cpu_percent": random.randint(20, 70) if not anomaly else 94,
            "memory_mb": random.randint(256, 1200) if not anomaly else 2200,
            "db_pool_wait_ms": random.randint(5, 50) if not anomaly else 280,
        }
        post_json("http://localhost:8004/telemetry", payload)


if __name__ == "__main__":
    main()

