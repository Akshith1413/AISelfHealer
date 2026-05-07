from __future__ import annotations

import math


def predict_replicas(history: list[dict], current_replicas: int = 1, target_rps_per_replica: int = 160) -> dict:
    if not history:
        return {"predicted_rps": 0, "recommended_replicas": current_replicas, "confidence": 0.5}
    recent = history[-12:]
    rps_values = [float(point.get("throughput_rps", 0)) for point in recent]
    slope = 0.0
    if len(rps_values) > 1:
        slope = (rps_values[-1] - rps_values[0]) / max(1, len(rps_values) - 1)
    predicted = max(0.0, rps_values[-1] + slope * 6)
    replicas = max(1, min(12, math.ceil(predicted / target_rps_per_replica)))
    return {
        "predicted_rps": round(predicted, 2),
        "recommended_replicas": max(current_replicas, replicas),
        "confidence": 0.82 if len(history) >= 6 else 0.6,
        "model": "trend_regression_fallback",
    }

