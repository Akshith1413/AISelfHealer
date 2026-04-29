# Implementation Checklist

This checklist maps the source documentation to concrete project files.

| Requirement | Implemented In |
|---|---|
| 8+ microservices | `services/api-gateway`, `auth-service`, `user-service`, `data-service`, `worker-service`, `ai-service`, `metrics-aggregator`, `healing-orchestrator`, `notification-service`, `chaos-service`, `health-monitor` |
| REST, gRPC, Kafka communication | REST in all services, gRPC proto/server/client in `services/ai-service`, Kafka topics in `contracts/topics.md` and `infrastructure/kafka/topics.sh` |
| API gateway | `services/api-gateway/src/server.js`, `services/api-gateway/src/routing.js`, `services/api-gateway/src/rateLimit.js` |
| JWT RS256 auth and refresh rotation | `services/auth-service/src/server.js`, `services/auth-service/src/tokenStore.js` |
| RBAC and tenant claims | `services/api-gateway/src/auth.js`, `services/auth-service/src/rbac.js`, PostgreSQL RLS in `infrastructure/postgres/init.sql` |
| Redis token bucket, cache, circuit/reroute flags | `services/api-gateway/src/rateLimit.js`, `services/healing-orchestrator/src/state.py`, `docker-compose.yml` |
| CQRS Data Service | `services/data-service/src/main.py`, `services/data-service/src/repository.py`, `infrastructure/postgres/init.sql` |
| Idempotency keys | `services/data-service/src/idempotency.py` |
| Worker priority queues and DLQ | `services/worker-service/src/main.py` |
| Prometheus metrics | `/metrics` endpoints in every service, `observability/prometheus/prometheus.yml` |
| Structured logging | Service logging middleware in Node and Python services |
| OpenTelemetry/Jaeger | Python instrumentation helpers and `observability/otel/otel-collector.yaml` |
| Alertmanager rules | `observability/prometheus/rules.yml`, `observability/alertmanager/alertmanager.yml` |
| Isolation Forest | `services/ai-service/src/anomaly.py`, `services/ai-service/training/train_models.py` |
| LSTM-style sequence detector | `services/ai-service/src/anomaly.py` sequence probability path |
| Predictive scaling | `services/ai-service/src/scaling.py`, `services/healing-orchestrator/src/main.py` |
| Root cause analysis | `services/ai-service/src/rca.py` |
| MLflow and drift metadata | `services/ai-service/src/model_registry.py`, `docker-compose.yml` |
| Health monitor and registry | `services/health-monitor/main.go` |
| Healing orchestration | `services/healing-orchestrator/src/main.py` |
| Circuit breaker state machine | `services/healing-orchestrator/src/circuit_breaker.py` |
| Notification dedupe and routing | `services/notification-service/src/server.js` |
| Chaos experiments | `services/chaos-service/src/main.py`, `chaos/experiments/*.yaml`, `chaos/chaos-engine.py` |
| React dashboard | `frontend/src` |
| WebSocket updates | `services/api-gateway/src/socketHub.js`, `frontend/src/hooks/useRealtime.js` |
| Docker Compose local stack | `docker-compose.yml` |
| Kubernetes and Helm | `helm/neuralmesh` |
| Vault config | `infrastructure/vault/vault-config.hcl` |
| mTLS and Istio path | `infrastructure/mtls`, `infrastructure/istio`, Helm templates |
| CI/CD | `.github/workflows/ci.yml`, `.github/workflows/security-scan.yml` |
| k6 load test | `load-tests/neuralmesh.js` |
| Demo docs and scripts | `docs/demo-guide.md`, `scripts/demo.ps1` |

