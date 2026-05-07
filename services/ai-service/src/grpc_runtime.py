from __future__ import annotations

import importlib
import os
import sys
import tempfile
from concurrent import futures
from pathlib import Path

import grpc
from grpc_tools import protoc

_server: grpc.Server | None = None


def _generate_proto_modules():
    out_dir = Path(tempfile.gettempdir()) / "neuralmesh_ai_proto"
    out_dir.mkdir(exist_ok=True)
    proto_file = Path(__file__).resolve().parents[1] / "proto" / "anomaly.proto"
    if str(out_dir) not in sys.path:
        sys.path.insert(0, str(out_dir))
    protoc.main([
        "grpc_tools.protoc",
        f"-I{proto_file.parent}",
        f"--python_out={out_dir}",
        f"--grpc_python_out={out_dir}",
        str(proto_file),
    ])
    pb2 = importlib.import_module("anomaly_pb2")
    pb2_grpc = importlib.import_module("anomaly_pb2_grpc")
    return pb2, pb2_grpc


def start_grpc_server(detector, port: int = 50051) -> grpc.Server | None:
    global _server
    if _server is not None:
        return _server
    if os.getenv("ENABLE_GRPC", "true").lower() == "false":
        return None

    pb2, pb2_grpc = _generate_proto_modules()

    class Servicer(pb2_grpc.AnomalyDetectorServicer):
        def ScoreWindow(self, request, context):  # noqa: N802 - generated gRPC style
            points = [
                {
                    "p99_latency_ms": point.p99_latency_ms,
                    "error_rate": point.error_rate,
                    "throughput_rps": point.throughput_rps,
                    "cpu_percent": point.cpu_percent,
                    "memory_mb": point.memory_mb,
                    "gc_pause_ms": point.gc_pause_ms,
                    "db_pool_wait_ms": point.db_pool_wait_ms,
                }
                for point in request.points
            ]
            score = detector.score_window(request.service_id, points)
            return pb2.AnomalyScore(
                service_id=score.service_id,
                is_anomaly=score.is_anomaly,
                isolation_score=score.isolation_score,
                lstm_probability=score.lstm_probability,
                severity=score.severity,
                recommended_action=score.recommended_action,
            )

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=4))
    pb2_grpc.add_AnomalyDetectorServicer_to_server(Servicer(), server)
    server.add_insecure_port(f"[::]:{port}")
    server.start()
    _server = server
    return server

