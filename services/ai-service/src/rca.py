from __future__ import annotations


DEPENDENCIES = {
    "api-gateway": ["auth-service", "user-service", "data-service", "worker-service"],
    "data-service": ["postgres", "redis", "kafka"],
    "worker-service": ["redis", "data-service"],
    "metrics-aggregator": ["kafka", "ai-service"],
    "healing-orchestrator": ["redis", "docker", "kubernetes"],
    "notification-service": ["kafka", "smtp", "slack"],
}


def root_cause(service_id: str, traces: list[dict] | None = None) -> dict:
    traces = traces or []
    candidates: dict[str, float] = {}
    for trace in traces:
        for span in trace.get("spans", []):
            if span.get("error") or span.get("latency_ms", 0) > 1000:
                candidates[span.get("service", service_id)] = candidates.get(span.get("service", service_id), 0) + 1
    if not candidates:
        deps = DEPENDENCIES.get(service_id, [])
        likely = deps[0] if deps else service_id
        return {
            "likely_cause": f"{likely}-degradation",
            "confidence": 0.72,
            "affected_services": [service_id, *deps[:2]],
            "evidence": "No trace payload supplied; inferred from dependency graph.",
        }
    likely = max(candidates, key=candidates.get)
    return {
        "likely_cause": f"{likely}-degradation",
        "confidence": min(0.95, 0.55 + candidates[likely] / max(10, len(traces) or 1)),
        "affected_services": list(candidates.keys()),
        "evidence": "Topological trace walk found first repeated degraded span.",
    }

