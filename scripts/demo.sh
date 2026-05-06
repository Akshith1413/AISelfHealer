#!/usr/bin/env bash
set -euo pipefail

echo "NeuralMesh demo starting..."
curl -sS -X POST http://localhost:8080/api/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"demo@neuralmesh.local","password":"Passw0rd!","roles":["super_admin"]}' >/dev/null || true

TOKEN=$(curl -sS -X POST http://localhost:8080/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"demo@neuralmesh.local","password":"Passw0rd!"}' | python -c 'import json,sys; print(json.load(sys.stdin)["accessToken"])')

curl -sS -X POST http://localhost:8080/api/v1/metrics/telemetry \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"service_id":"data-service","p99_latency_ms":980,"error_rate":0.12,"throughput_rps":780,"cpu_percent":94,"memory_mb":2300,"db_pool_wait_ms":320}' | python -m json.tool

curl -sS -X POST http://localhost:8080/api/v1/chaos/run \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"experiment":"pod_kill","service_name":"data-service","dry_run":true}' | python -m json.tool

echo "Dashboard: http://localhost:5173"

