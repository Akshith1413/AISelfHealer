from __future__ import annotations

import random
import time

import docker


class ChaosEngine:
    def __init__(self):
        self.client = docker.from_env()

    def kill_random_service(self, exclude=None):
        services = [s for s in self.client.containers.list() if s.name not in (exclude or [])]
        target = random.choice(services)
        print(f"[CHAOS] Killing: {target.name}")
        target.kill()
        return target.name

    def inject_latency(self, service_name: str, delay_ms: int, duration_s: int):
        container = self.client.containers.get(service_name)
        container.exec_run(f"tc qdisc add dev eth0 root netem delay {delay_ms}ms")
        time.sleep(duration_s)
        container.exec_run("tc qdisc del dev eth0 root netem")
        return {"service_name": service_name, "delay_ms": delay_ms, "duration_s": duration_s}

    def cpu_stress(self, service_name: str, duration_s: int = 30):
        container = self.client.containers.get(service_name)
        return container.exec_run(f"sh -lc 'timeout {duration_s}s yes > /dev/null'")

