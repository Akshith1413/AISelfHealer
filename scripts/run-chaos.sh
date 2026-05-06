#!/usr/bin/env bash
set -euo pipefail

EXPERIMENT="${1:-pod_kill}"
SERVICE="${2:-data-service}"

curl -sS -X POST http://localhost:8006/run \
  -H 'content-type: application/json' \
  -d "{\"experiment\":\"$EXPERIMENT\",\"service_name\":\"$SERVICE\",\"dry_run\":true}" | python -m json.tool

