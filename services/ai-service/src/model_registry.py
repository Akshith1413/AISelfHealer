from __future__ import annotations

from datetime import UTC, datetime


MODEL_REGISTRY = {
    "isolation_forest": {
        "version": "1.0.0",
        "stage": "Production",
        "trained_on": "synthetic_30_day_baseline",
        "metrics": {"precision": 0.87, "recall": 0.83},
    },
    "sequence_detector": {
        "version": "1.0.0",
        "stage": "Production",
        "trained_on": "synthetic_sequence_windows",
        "metrics": {"precision": 0.84, "recall": 0.81},
    },
}


def registry_payload() -> dict:
    return {
        "tracking_uri": __import__("os").environ.get("MLFLOW_TRACKING_URI", "local://mlruns"),
        "models": MODEL_REGISTRY,
        "loaded_at": datetime.now(UTC).isoformat(),
    }


def drift_report(predictions: list[float]) -> dict:
    if not predictions:
        return {"drift_detected": False, "drift_score": 0.0, "threshold": 0.25}
    average = sum(predictions) / len(predictions)
    drift_score = abs(average - 0.12)
    return {
        "drift_detected": drift_score > 0.25,
        "drift_score": round(drift_score, 4),
        "threshold": 0.25,
        "checked_at": datetime.now(UTC).isoformat(),
    }

