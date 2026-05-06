from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable

import numpy as np
from sklearn.ensemble import IsolationForest

FEATURES = [
    "p99_latency_ms",
    "error_rate",
    "throughput_rps",
    "cpu_percent",
    "memory_mb",
    "gc_pause_ms",
    "db_pool_wait_ms",
]


def generate_baseline(samples: int = 2400, seed: int = 42) -> np.ndarray:
    rng = np.random.default_rng(seed)
    latency = rng.normal(120, 25, samples).clip(20, 250)
    error = rng.normal(0.01, 0.006, samples).clip(0, 0.04)
    rps = rng.normal(180, 50, samples).clip(20, 420)
    cpu = rng.normal(45, 12, samples).clip(5, 78)
    memory = rng.normal(700, 140, samples).clip(128, 1300)
    gc_pause = rng.normal(8, 4, samples).clip(0, 30)
    db_wait = rng.normal(18, 8, samples).clip(0, 65)
    return np.column_stack([latency, error, rps, cpu, memory, gc_pause, db_wait])


def vectorize(points: Iterable[dict]) -> np.ndarray:
    rows = []
    for point in points:
        rows.append([float(point.get(feature, 0.0)) for feature in FEATURES])
    if not rows:
        rows.append([0.0] * len(FEATURES))
    return np.array(rows, dtype=float)


@dataclass
class Score:
    service_id: str
    is_anomaly: bool
    isolation_score: float
    lstm_probability: float
    severity: str
    recommended_action: str
    anomaly_type: str


class AnomalyDetector:
    def __init__(self) -> None:
        self.baseline = generate_baseline()
        self.model = IsolationForest(n_estimators=200, contamination=0.05, random_state=42)
        self.model.fit(self.baseline)
        self.baseline_mean = self.baseline.mean(axis=0)
        self.baseline_std = self.baseline.std(axis=0) + 1e-9

    def score_window(self, service_id: str, points: list[dict]) -> Score:
        matrix = vectorize(points)
        latest = matrix[-1:]
        isolation = float(self.model.decision_function(latest)[0])
        z = np.abs((matrix[-min(len(matrix), 30):] - self.baseline_mean) / self.baseline_std)
        # A lightweight sequence-risk probability that mirrors an LSTM detector's output shape.
        sequence_energy = float(np.mean(np.maximum(z - 1.5, 0)))
        lstm_probability = 1 / (1 + math.exp(-(sequence_energy - 0.65) * 2.8))
        p99, error_rate, _rps, cpu, memory, _gc, db_wait = latest[0]

        if isolation < -0.3 and lstm_probability > 0.65:
            severity = "critical"
            action = "restart_or_reroute"
        elif isolation < -0.15 or lstm_probability > 0.5:
            severity = "warning"
            action = "open_circuit"
        else:
            severity = "normal"
            action = "observe"

        anomaly_type = "normal"
        if p99 > 350 or db_wait > 120:
            anomaly_type = "latency_spike"
        if error_rate > 0.05:
            anomaly_type = "error_rate_spike"
        if cpu > 85 or memory > 1600:
            anomaly_type = "resource_pressure"

        return Score(
            service_id=service_id,
            is_anomaly=severity != "normal",
            isolation_score=round(isolation, 4),
            lstm_probability=round(float(lstm_probability), 4),
            severity=severity,
            recommended_action=action,
            anomaly_type=anomaly_type,
        )

