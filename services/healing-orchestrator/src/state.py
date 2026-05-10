from __future__ import annotations


class RerouteStore:
    def __init__(self) -> None:
        self.flags: dict[str, dict] = {}

    def set_reroute(self, service_id: str, target: str, ttl_seconds: int = 60) -> dict:
        import time

        flag = {"service_id": service_id, "target": target, "expires_at": time.time() + ttl_seconds}
        self.flags[service_id] = flag
        return flag

    def get(self, service_id: str) -> dict | None:
        import time

        flag = self.flags.get(service_id)
        if not flag:
            return None
        if flag["expires_at"] < time.time():
            self.flags.pop(service_id, None)
            return None
        return flag

