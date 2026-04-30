# NeuralMesh — AI-Driven Self-Healing Distributed Microservices Platform

> **Tagline:** The platform that watches itself, heals itself, and scales itself — powered by AI.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Why This Project Gets You Hired](#2-why-this-project-gets-you-hired)
3. [Full System Architecture](#3-full-system-architecture)
4. [Tech Stack — Complete Breakdown](#4-tech-stack--complete-breakdown)
5. [Microservices Layer](#5-microservices-layer)
6. [Observability & Telemetry Layer](#6-observability--telemetry-layer)
7. [AI/ML Intelligence Layer](#7-aiml-intelligence-layer)
8. [Infrastructure & DevOps Layer](#8-infrastructure--devops-layer)
9. [Security Layer](#9-security-layer)
10. [Data Layer](#10-data-layer)
11. [Frontend Dashboard](#11-frontend-dashboard)
12. [Event-Driven Communication](#12-event-driven-communication)
13. [Chaos Engineering Module](#13-chaos-engineering-module)
14. [Multi-Tenancy & RBAC](#14-multi-tenancy--rbac)
15. [Distributed Tracing & Profiling](#15-distributed-tracing--profiling)
16. [Advanced Features to Add Progressively](#16-advanced-features-to-add-progressively)
17. [Implementation Roadmap](#17-implementation-roadmap)
18. [Repository Structure](#18-repository-structure)
19. [How to Demo This in Interviews](#19-how-to-demo-this-in-interviews)
20. [Concepts You'll Learn](#20-concepts-youll-learn)

---

## 1. Project Overview

**NeuralMesh** is a production-grade, AI-native distributed systems platform that simulates what a real SRE (Site Reliability Engineering) team builds at companies like Google, Netflix, Uber, and Amazon. It combines distributed microservices, real-time observability, machine-learning-based anomaly detection, automatic fault recovery, predictive auto-scaling, chaos engineering, and a live monitoring dashboard — all wired together in a fully Dockerized, CI/CD-enabled environment.

The system is not a toy. Every component maps directly to a technology interviewers ask about. Every design decision has a defensible reason. The result is a portfolio centerpiece that demonstrates backend engineering maturity, distributed systems depth, and AI integration in a single coherent project.

### What the System Does

- Runs 8+ microservices that communicate over REST, gRPC, and Kafka
- Collects metrics, logs, and distributed traces from every service in real time
- Feeds telemetry data into an ML anomaly detection pipeline (Isolation Forest + LSTM)
- Automatically restarts failed services, reroutes traffic, and applies circuit breakers
- Scales services up or down based on AI-predicted load — before the load actually hits
- Simulates infrastructure failures deliberately via a Chaos Engineering module
- Enforces authentication, rate limiting, mTLS, and RBAC across every service boundary
- Exposes a live React dashboard showing the health graph, anomaly alerts, and scaling events
- Runs fully on Docker Compose locally and deploys to Kubernetes with Helm charts

---

## 2. Why This Project Gets You Hired

### Concepts It Covers (Interview Checklist)

| Topic | Demonstrated By |
|---|---|
| Microservices Architecture | 8-service mesh, API gateway, service registry |
| Distributed Systems | CAP theorem trade-offs, consensus, leader election |
| Message Queues | Kafka event bus between services |
| Caching | Redis for session store, rate limit counters, hot-path caching |
| Database Design | PostgreSQL with partitioning, TimescaleDB for time-series |
| gRPC | Internal service-to-service communication |
| REST API Design | External-facing APIs with versioning |
| Circuit Breaker | Resilience4j / custom implementation |
| Rate Limiting | Token bucket algorithm in API Gateway |
| Observability | Prometheus + Grafana + Jaeger (metrics, logs, traces) |
| AI/ML Integration | Anomaly detection, predictive scaling |
| Containerization | Docker, Docker Compose, multi-stage builds |
| Kubernetes | Helm charts, HPA, Ingress, ConfigMaps, Secrets |
| CI/CD | GitHub Actions pipeline with automated tests |
| Security | JWT, mTLS, RBAC, secrets management with Vault |
| Chaos Engineering | Controlled failure injection and recovery testing |
| Service Mesh | Istio (optional layer) for traffic management |
| Distributed Tracing | OpenTelemetry + Jaeger, trace propagation |
| Event Sourcing | Kafka-backed audit log with replay |
| CQRS | Separate read/write paths in Data Service |

### What Interviewers Ask and What You Answer

**"Tell me about a challenging technical decision."**
> "In NeuralMesh I had to choose between a push-based and pull-based metrics model. Pull (Prometheus scraping) is simpler but doesn't work across NAT boundaries. I went with a hybrid — Prometheus scraping within each pod, but pushing aggregated anomaly signals to a central Kafka topic, because the AI layer needed real-time streams, not periodic snapshots."

**"How do you handle partial failures?"**
> "NeuralMesh uses circuit breakers at every service boundary with three states: Closed, Open, and Half-Open. When a downstream service exceeds an error threshold, the circuit opens and we return cached responses or a graceful degradation response. The Health Monitor detects this, emits a Kafka event, and the orchestrator attempts restart or traffic rerouting."

**"How does the AI component work?"**
> "I trained an Isolation Forest model offline on synthetic baseline telemetry data — P99 latency, error rate, CPU, memory — and deployed it as a FastAPI inference microservice. In real time, the Metrics Aggregator feeds a sliding 60-second window of telemetry to the model via gRPC. The model scores each window for anomaly probability. Anything above 0.75 triggers a healing workflow."

---

## 3. Full System Architecture

```
                        ┌────────────────────────────────────────────────┐
                        │              External Clients                   │
                        └──────────────────────┬─────────────────────────┘
                                               │ HTTPS
                        ┌──────────────────────▼─────────────────────────┐
                        │           API Gateway (Nginx + Kong)            │
                        │  Rate Limiting │ Auth │ Routing │ Load Balance  │
                        └──┬──────┬──────┬──────┬──────────┬─────────────┘
                           │      │      │      │          │
              ┌────────────▼─┐ ┌──▼───┐ ┌▼───┐ ┌▼──────┐ ┌▼────────────┐
              │ Auth Service │ │ User │ │Data│ │Worker│ │ Notification │
              │  (Node.js)   │ │ Svc  │ │Svc │ │ Svc  │ │   Service   │
              └──────────────┘ └──┬───┘ └─┬──┘ └──┬───┘ └──────────────┘
                                  │        │       │
                        ┌─────────▼────────▼───────▼──────────────────┐
                        │             Kafka Event Bus                  │
                        │   Topics: metrics / alerts / healing / audit │
                        └──────────────────┬──────────────────────────┘
                                           │
              ┌────────────────────────────▼────────────────────────────┐
              │                  Observability Layer                     │
              │   Prometheus → Grafana    │    Jaeger (Tracing)          │
              │   Loki (Logs)             │    OpenTelemetry Collector   │
              └────────────────────────────┬────────────────────────────┘
                                           │
              ┌────────────────────────────▼────────────────────────────┐
              │                    AI Intelligence Layer                 │
              │  Anomaly Detector (Isolation Forest + LSTM)              │
              │  Predictive Scaler (Prophet / XGBoost)                   │
              │  Root Cause Analyzer (Graph-based reasoning)             │
              └────────────────────────────┬────────────────────────────┘
                                           │
              ┌────────────────────────────▼────────────────────────────┐
              │                    Healing Orchestrator                  │
              │  Circuit Breaker │ Auto-restart │ Traffic Reroute        │
              │  Rollback Engine │ Canary Deploy│ Pod Eviction           │
              └────────────────────────────┬────────────────────────────┘
                                           │
              ┌────────────────────────────▼────────────────────────────┐
              │                    Infrastructure Layer                  │
              │   Docker / Kubernetes │ HashiCorp Vault │ Redis          │
              │   PostgreSQL + TimescaleDB │ MinIO (S3-compatible)       │
              └─────────────────────────────────────────────────────────┘
```

---

## 4. Tech Stack — Complete Breakdown

### Backend Services

| Service | Language | Framework | Why |
|---|---|---|---|
| API Gateway | Node.js | Express + Kong | Kong plugins for rate limiting, JWT auth, logging |
| Auth Service | Node.js | Express + Passport | JWT issuance, OAuth2 (Google), refresh token rotation |
| User Service | Node.js | Fastify | High-performance REST, JSON schema validation |
| Data Service | Python | FastAPI | CQRS pattern, heavy read/write separation |
| Worker Service | Python | Celery | Async background job processing |
| AI Service | Python | FastAPI + scikit-learn | ML model inference, anomaly scoring |
| Notification Service | Node.js | Bull + Nodemailer | Email/Slack/Webhook alerting |
| Health Monitor | Go | net/http | Ultra-low latency health checks and heartbeats |

### Observability Stack

| Tool | Role |
|---|---|
| Prometheus | Time-series metrics scraping and storage |
| Grafana | Dashboard visualization |
| Loki | Log aggregation (Prometheus for logs) |
| Promtail | Log shipping agent |
| Jaeger | Distributed tracing UI |
| OpenTelemetry | Unified instrumentation SDK |
| Alertmanager | Rule-based alerting to Slack/PagerDuty |

### AI/ML Stack

| Tool | Purpose |
|---|---|
| scikit-learn | Isolation Forest (anomaly detection) |
| PyTorch (LSTM) | Sequence-based anomaly detection on time-series |
| Facebook Prophet | Seasonal trend forecasting for predictive scaling |
| XGBoost | Predictive auto-scaling regression model |
| MLflow | Experiment tracking, model registry, versioning |
| Evidently AI | Model drift detection in production |

### Infrastructure

| Tool | Role |
|---|---|
| Docker + Compose | Local containerized environment |
| Kubernetes | Production orchestration |
| Helm | Kubernetes package manager |
| HashiCorp Vault | Secrets management |
| Redis | Cache, session store, rate limit counters |
| Kafka | Async event bus |
| Zookeeper | Kafka coordination |
| PostgreSQL | Primary relational store |
| TimescaleDB | Time-series extension on Postgres |
| MinIO | S3-compatible object storage for ML artifacts |
| Nginx | Reverse proxy, SSL termination |

### Frontend

| Tool | Role |
|---|---|
| React + Vite | SPA dashboard |
| Tailwind CSS | Utility-first styling |
| Recharts | Metric graphs |
| Cytoscape.js | Service dependency graph visualization |
| React Query | Server state management |
| Zustand | Global client state |
| Socket.io Client | Real-time dashboard updates |

### DevOps / CI-CD

| Tool | Role |
|---|---|
| GitHub Actions | CI pipeline (lint, test, build, push) |
| Docker Hub | Container registry |
| Trivy | Container vulnerability scanning |
| SonarQube | Static code analysis |
| k6 | Load testing |
| Pytest | Python unit + integration tests |
| Jest | JavaScript unit tests |

---

## 5. Microservices Layer

### 5.1 API Gateway

The single entry point for all external traffic. Responsibilities:

- **Rate Limiting:** Token bucket algorithm per IP and per authenticated user. Redis stores the bucket state. Headers `X-RateLimit-Remaining` and `X-RateLimit-Reset` are returned on every request.
- **JWT Verification:** Validates tokens on every request before forwarding. Tokens use RS256 (asymmetric) so downstream services can verify without calling Auth Service.
- **Dynamic Routing:** Routes requests to the correct service based on path prefix. Routing table is stored in Redis and hot-reloadable without restart.
- **Request ID Injection:** Stamps every incoming request with a UUID that propagates as `X-Request-ID` through all downstream calls — the anchor for distributed tracing.
- **Response Caching:** GET requests for stable resources (user profile, config) are cached in Redis with TTL.

Key code pattern — Kong declarative config:

```yaml
services:
  - name: user-service
    url: http://user-service:3001
    routes:
      - name: users-route
        paths: [/api/v1/users]
    plugins:
      - name: jwt
      - name: rate-limiting
        config:
          minute: 100
          policy: redis
```

### 5.2 Auth Service

- Issues short-lived JWTs (15 min) and long-lived refresh tokens (7 days) stored in HttpOnly cookies
- Implements refresh token rotation — every refresh call invalidates the old token and issues a new pair
- Supports OAuth2 with Google (Passport.js strategy)
- Maintains a token blacklist in Redis for immediate revocation
- Emits a Kafka event `user.auth` on every login/logout for audit trail

### 5.3 Data Service (CQRS Pattern)

Implements Command Query Responsibility Segregation:

- **Write path** (Commands): Validated via Pydantic, written to PostgreSQL, then an event is emitted to Kafka. The write model is normalized.
- **Read path** (Queries): Reads from a denormalized read replica updated by a Kafka consumer. This eliminates JOIN-heavy read queries.
- All database writes go through an idempotency layer — duplicate requests with the same `Idempotency-Key` header return the cached response without re-executing.

### 5.4 Worker Service

Celery-based async job processor:

- Processes background jobs: report generation, bulk emails, data exports
- Supports job priority queues (high / medium / low)
- Implements retry with exponential backoff and dead-letter queuing
- Exposes `/workers/status` endpoint showing queue depth, active workers, failed jobs

### 5.5 Health Monitor (Go)

Written in Go for minimal footprint and maximum performance:

- Performs HTTP health checks on every registered service every 5 seconds
- Tracks response time P50/P95/P99 with an in-memory ring buffer
- Detects heartbeat absence and immediately emits a `service.down` Kafka event
- Maintains a service registry (etcd-backed) — services self-register on startup
- Computes a composite health score per service: `(uptime_ratio * 0.4) + (error_rate_inverted * 0.4) + (latency_score * 0.2)`

### 5.6 Notification Service

- Listens to Kafka topics: `alerts.critical`, `alerts.warning`, `healing.complete`
- Routes alerts to the correct channel: Slack webhook, email (Nodemailer), or generic webhook
- Implements deduplication — the same alert for the same service within 5 minutes is suppressed
- Persists notification history to PostgreSQL for audit

---

## 6. Observability & Telemetry Layer

### The Three Pillars

**Metrics (Prometheus):**

Every service exposes a `/metrics` endpoint in Prometheus exposition format. Custom metrics defined per service:

```python
# Python example (FastAPI)
from prometheus_client import Counter, Histogram, Gauge

REQUEST_COUNT = Counter('http_requests_total', 'Total requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'Request latency', ['endpoint'])
ACTIVE_CONNECTIONS = Gauge('active_connections', 'Active connections')
```

**Logs (Loki + Promtail):**

All services log in structured JSON format:

```json
{
  "timestamp": "2025-01-15T14:23:01Z",
  "level": "ERROR",
  "service": "data-service",
  "request_id": "uuid-here",
  "user_id": "user_123",
  "message": "Database connection timeout",
  "latency_ms": 5023,
  "trace_id": "trace-abc"
}
```

Promtail ships logs to Loki. Grafana queries Loki with LogQL: `{service="data-service"} |= "ERROR" | json | latency_ms > 1000`

**Traces (Jaeger + OpenTelemetry):**

Every service is instrumented with the OpenTelemetry SDK. A trace spans the entire request lifecycle — from API Gateway through every downstream call:

```
[API Gateway] → [Auth Service] → [User Service] → [Data Service] → [PostgreSQL]
  span: 120ms      span: 8ms        span: 12ms       span: 95ms      span: 88ms
```

Trace context propagates via HTTP headers (`traceparent`, `tracestate`) and Kafka message headers.

### Alerting Rules (Prometheus Alertmanager)

```yaml
groups:
  - name: neuralmesh.rules
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.service }} error rate above 5%"

      - alert: HighP99Latency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 3m
        labels:
          severity: warning
```

---

## 7. AI/ML Intelligence Layer

### 7.1 Anomaly Detection Pipeline

**Data Collection:**
The Metrics Aggregator collects a 60-second sliding window of features per service:
- `p99_latency_ms` — 99th percentile request latency
- `error_rate` — fraction of 5xx responses
- `throughput_rps` — requests per second
- `cpu_percent` — CPU utilization
- `memory_mb` — memory usage
- `gc_pause_ms` — garbage collection pause duration (JVM services)
- `db_pool_wait_ms` — database connection pool wait time

**Model 1 — Isolation Forest (Fast Path):**

Sklearn Isolation Forest trained on 30 days of synthetic baseline data. Runs inference every 10 seconds. Outputs anomaly score between -1 (anomaly) and 1 (normal). Threshold at -0.3 triggers a "soft alert."

```python
from sklearn.ensemble import IsolationForest
import numpy as np

model = IsolationForest(n_estimators=200, contamination=0.05, random_state=42)
model.fit(baseline_telemetry)

def score_window(window: np.ndarray) -> float:
    return model.decision_function(window.reshape(1, -1))[0]
```

**Model 2 — LSTM (Deep Path):**

A PyTorch LSTM trained on historical time-series sequences of length 30 (30 seconds of data). Better at detecting slow, gradual drift that Isolation Forest misses. Runs every 30 seconds as a secondary check.

```python
class AnomalyLSTM(nn.Module):
    def __init__(self, input_size=7, hidden_size=64, num_layers=2):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2)
        self.classifier = nn.Linear(hidden_size, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.sigmoid(self.classifier(out[:, -1, :]))
```

**Scoring Logic:**

```
IF Isolation_Forest_score < -0.3 AND LSTM_probability > 0.65:
    → HARD ANOMALY → Immediate healing trigger
ELIF Isolation_Forest_score < -0.15 OR LSTM_probability > 0.5:
    → SOFT ANOMALY → Warning alert, increased monitoring frequency
ELSE:
    → Normal
```

**Model Serving:**

The AI Service exposes a gRPC endpoint (defined in `.proto`) for low-latency inference. REST fallback for the dashboard.

```protobuf
service AnomalyDetector {
  rpc ScoreWindow (TelemetryWindow) returns (AnomalyScore);
  rpc BatchScore (BatchRequest) returns (BatchResponse);
}

message TelemetryWindow {
  string service_id = 1;
  repeated TelemetryPoint points = 2;
  int64 timestamp = 3;
}

message AnomalyScore {
  string service_id = 1;
  float isolation_score = 2;
  float lstm_probability = 3;
  bool is_anomaly = 4;
  string anomaly_type = 5;
}
```

### 7.2 Predictive Auto-Scaling

Uses Facebook Prophet to model seasonal traffic patterns (daily, weekly cycles) and forecast load 15 minutes ahead. XGBoost regressor maps predicted load to required replica count.

```python
from prophet import Prophet

model = Prophet(
    changepoint_prior_scale=0.05,
    seasonality_mode='multiplicative',
    daily_seasonality=True,
    weekly_seasonality=True
)
model.fit(historical_rps_df)

future = model.make_future_dataframe(periods=15, freq='1min')
forecast = model.predict(future)
predicted_rps_15min = forecast.iloc[-1]['yhat']

required_replicas = xgb_scaler.predict([[predicted_rps_15min, current_cpu, current_memory]])[0]
```

The Scaling Orchestrator calls the Kubernetes API to update the `replicas` field of the Deployment before load peaks — proactive, not reactive.

### 7.3 Root Cause Analyzer

A graph-based reasoning system. Services are nodes; dependencies are directed edges (learned from distributed trace data). When an anomaly fires, the RCA module:

1. Fetches the last 100 traces involving the anomalous service
2. Builds a dependency subgraph
3. Uses a topological walk to find which upstream service first showed degradation
4. Emits a structured `root_cause` event: `{ "likely_cause": "postgres-pool-exhaustion", "confidence": 0.87, "affected_services": ["data-service", "worker-service"] }`

### 7.4 MLflow Model Registry

All models are tracked in MLflow:

- Every training run logs parameters, metrics, and artifacts
- The best model by validation F1 score is promoted to `Production` stage
- The AI Service loads the production model at startup via MLflow's model registry API
- Evidently AI monitors prediction distribution drift daily and fires an alert when drift exceeds threshold — triggering a retraining pipeline

---

## 8. Infrastructure & DevOps Layer

### 8.1 Docker Compose (Local Development)

Full environment starts with `docker compose up -d`. Services include:

- api-gateway, auth-service, user-service, data-service, worker-service, ai-service, notification-service, health-monitor
- kafka, zookeeper, redis, postgres, timescaledb, minio
- prometheus, grafana, loki, promtail, jaeger, alertmanager
- vault, mlflow

Health checks defined for every service. Dependencies encoded so services wait for their backends before starting.

### 8.2 Kubernetes + Helm

Helm chart structure:

```
neuralmesh/
  Chart.yaml
  values.yaml
  values-production.yaml
  templates/
    deployment.yaml      # parameterized per service
    service.yaml
    ingress.yaml
    hpa.yaml             # Horizontal Pod Autoscaler
    configmap.yaml
    secret.yaml
    serviceaccount.yaml
    networkpolicy.yaml
```

HPA configuration for Data Service:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: data-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: data-service
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "500"
```

### 8.3 GitHub Actions CI/CD Pipeline

```yaml
name: NeuralMesh CI

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: timescale/timescaledb:latest-pg15
      redis:
        image: redis:7-alpine

    steps:
      - uses: actions/checkout@v4
      - name: Run unit tests
        run: |
          cd services/ai-service && pip install -r requirements.txt && pytest tests/unit
          cd services/data-service && pytest tests/unit
      - name: Run integration tests
        run: docker compose -f docker-compose.test.yml up --exit-code-from test-runner

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Trivy vulnerability scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          severity: CRITICAL,HIGH

      - name: SonarQube analysis
        uses: sonarcloud-github-action@master

  build-and-push:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    steps:
      - name: Build and push images
        run: |
          docker buildx build --platform linux/amd64,linux/arm64 \
            -t neuralmesh/ai-service:${{ github.sha }} \
            --push services/ai-service/

  deploy-staging:
    needs: build-and-push
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Helm upgrade staging
        run: helm upgrade neuralmesh ./helm/neuralmesh -f values-staging.yaml
```

### 8.4 HashiCorp Vault

Secrets managed by Vault, never in environment variables or config files:

- Database credentials fetched at pod startup via Vault Agent sidecar
- JWT signing keys stored as Vault secrets, rotated every 30 days automatically
- Kafka SASL credentials from Vault
- Dynamic database credentials: Vault generates time-limited Postgres users per service

---

## 9. Security Layer

### Authentication Flow

```
Client → API Gateway → [Validate JWT with public key] → Forward with X-User-ID header → Service
```

JWT payload:

```json
{
  "sub": "user_123",
  "email": "user@example.com",
  "roles": ["user"],
  "tenant_id": "tenant_abc",
  "iat": 1700000000,
  "exp": 1700000900,
  "jti": "unique-token-id"
}
```

### mTLS Between Services

All internal service-to-service gRPC calls use mutual TLS. Each service has a certificate signed by an internal CA (managed by Vault PKI). Certificates rotate every 24 hours.

### Network Policies (Kubernetes)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: data-service-policy
spec:
  podSelector:
    matchLabels:
      app: data-service
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
        - podSelector:
            matchLabels:
              app: worker-service
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
        - podSelector:
            matchLabels:
              app: redis
```

### Rate Limiting Algorithm (Token Bucket)

```javascript
async function checkRateLimit(userId, limit = 100, windowSeconds = 60) {
  const key = `rate:${userId}`;
  const now = Date.now();
  
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, now - windowSeconds * 1000);
  pipeline.zadd(key, now, `${now}-${Math.random()}`);
  pipeline.zcard(key);
  pipeline.expire(key, windowSeconds);
  
  const results = await pipeline.exec();
  const requestCount = results[2][1];
  
  return {
    allowed: requestCount <= limit,
    remaining: Math.max(0, limit - requestCount),
    reset: Math.ceil((now + windowSeconds * 1000) / 1000)
  };
}
```

---

## 10. Data Layer

### PostgreSQL Schema Design

Primary tables use UUID primary keys. All tables have `created_at`, `updated_at`, `deleted_at` (soft delete). Foreign keys enforced at the database level.

**TimescaleDB for Metrics:**

```sql
-- Convert metrics table to hypertable (time-series optimized)
SELECT create_hypertable('service_metrics', 'recorded_at', chunk_time_interval => INTERVAL '1 hour');

-- Continuous aggregate for hourly rollups (auto-updated)
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
  service_id,
  time_bucket('1 hour', recorded_at) AS hour,
  avg(p99_latency_ms) AS avg_p99,
  max(p99_latency_ms) AS max_p99,
  avg(error_rate) AS avg_error_rate,
  sum(request_count) AS total_requests
FROM service_metrics
GROUP BY service_id, hour;

-- Automatic data retention: drop data older than 90 days
SELECT add_retention_policy('service_metrics', INTERVAL '90 days');
```

### Redis Usage Patterns

| Key Pattern | Data Type | TTL | Purpose |
|---|---|---|---|
| `session:{token_id}` | Hash | 7 days | Refresh token store |
| `rate:{user_id}` | Sorted Set | 60s | Rate limit sliding window |
| `cache:user:{id}` | String (JSON) | 5 min | User profile cache |
| `circuit:{service}` | String | 30s | Circuit breaker state |
| `reroute:{service}` | String | 60s | Traffic reroute flag |
| `lock:{resource}` | String (NX) | 30s | Distributed lock |

### Event Sourcing with Kafka

Every state change in the system is an immutable event stored in Kafka. The audit trail is replayable:

```python
from dataclasses import dataclass
from datetime import datetime
import json

@dataclass
class ServiceEvent:
    event_id: str
    event_type: str        # service.down | anomaly.detected | healing.started
    service_id: str
    payload: dict
    timestamp: datetime
    causation_id: str      # ID of event that caused this event
    correlation_id: str    # ID linking all events in one incident

# Producer
producer.send(
    topic=f"neuralmesh.{event.event_type}",
    key=event.service_id.encode(),
    value=json.dumps(asdict(event)).encode(),
    headers=[("correlation_id", event.correlation_id.encode())]
)
```

---

## 11. Frontend Dashboard

### Tech Stack

React (Vite), Tailwind CSS, Recharts, Cytoscape.js (service graph), React Query, Socket.io

### Dashboard Pages

**1. Live Service Health Map**
- Cytoscape.js force-directed graph of all services
- Nodes colored by health score: green → yellow → red
- Edge thickness represents traffic volume
- Clicking a node shows its metrics panel

**2. Metrics Explorer**
- Grafana embedded via iframe for full Prometheus metric exploration
- Custom React charts for the top-level KPIs: error rate, P99 latency, RPS

**3. Anomaly Feed**
- Real-time WebSocket stream of anomaly events
- Each event shows: service, score, anomaly type, triggered action
- Timeline view of the last 24 hours of incidents

**4. Healing Events Log**
- Chronological list of all auto-healing actions taken
- Shows before/after state, time to recovery, which ML model triggered it

**5. Scaling History**
- Bar chart of replica count over time per service
- Predicted vs actual RPS overlay
- Model accuracy score for the predictive scaler

### Real-Time WebSocket

```javascript
// Backend (Node.js)
io.on('connection', (socket) => {
  kafkaConsumer.on('message', (message) => {
    if (message.topic === 'neuralmesh.anomaly.detected') {
      socket.emit('anomaly', JSON.parse(message.value));
    }
    if (message.topic === 'neuralmesh.healing.complete') {
      socket.emit('healing', JSON.parse(message.value));
    }
  });
});

// Frontend (React)
useEffect(() => {
  const socket = io(BACKEND_URL);
  socket.on('anomaly', (event) => {
    setAnomalies(prev => [event, ...prev].slice(0, 100));
  });
  return () => socket.disconnect();
}, []);
```

---

## 12. Event-Driven Communication

### Kafka Topic Design

| Topic | Partitions | Replication | Consumers | Purpose |
|---|---|---|---|---|
| `neuralmesh.metrics.raw` | 12 | 3 | AI Service, Prometheus exporter | Raw telemetry stream |
| `neuralmesh.anomaly.detected` | 4 | 3 | Healing Orchestrator, Notification | Anomaly signals |
| `neuralmesh.healing.started` | 4 | 3 | Dashboard, Audit Logger | Healing actions |
| `neuralmesh.healing.complete` | 4 | 3 | Dashboard, Metrics | Recovery events |
| `neuralmesh.scale.event` | 4 | 3 | Dashboard, Audit | Scaling actions |
| `neuralmesh.audit` | 1 | 3 | Audit DB Writer | Immutable audit log |

### Consumer Group Design

```python
# AI Service Kafka consumer
consumer = KafkaConsumer(
    'neuralmesh.metrics.raw',
    bootstrap_servers=['kafka:9092'],
    group_id='ai-service-anomaly-detector',    # ensures each partition read by one consumer
    auto_offset_reset='latest',
    enable_auto_commit=False,                   # manual commit after processing
    value_deserializer=lambda v: json.loads(v.decode())
)

for message in consumer:
    telemetry = message.value
    score = anomaly_detector.score(telemetry)
    
    if score.is_anomaly:
        producer.send('neuralmesh.anomaly.detected', value=score.to_dict())
    
    consumer.commit()    # commit only after successful processing
```

---

## 13. Chaos Engineering Module

A dedicated Chaos Service that deliberately injects failures to test system resilience. Controlled via the dashboard or CLI.

### Chaos Experiments

| Experiment | What It Does | What You're Testing |
|---|---|---|
| Pod Kill | Randomly kills a service container | Auto-restart, health check detection |
| Network Latency | Adds 500ms-2000ms delay to a service | Circuit breaker, timeout handling |
| Network Partition | Blocks traffic between two services | Fallback paths, graceful degradation |
| CPU Stress | Saturates CPU on a pod to 90% | Autoscaling trigger, throttling |
| Memory Leak | Gradually allocates memory until OOM | OOM killer, restart policy |
| Kafka Partition Loss | Removes a Kafka partition | Consumer rebalancing, message replay |
| Database Connection Exhaustion | Fills the connection pool | Pool wait handling, circuit breaker |
| DNS Failure | Breaks service discovery for one service | Retry logic, fallback endpoints |

### Implementation

```python
import docker
import time
import random

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
        # Use tc (traffic control) to add latency
        container.exec_run(
            f"tc qdisc add dev eth0 root netem delay {delay_ms}ms"
        )
        time.sleep(duration_s)
        container.exec_run("tc qdisc del dev eth0 root netem")
```

---

## 14. Multi-Tenancy & RBAC

### Tenant Isolation

Every resource is tagged with `tenant_id`. Row-level security enforced at the PostgreSQL level:

```sql
ALTER TABLE service_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON service_metrics
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

Every database connection sets: `SET app.tenant_id = 'tenant-uuid';`

### RBAC Model

```
Roles:
  super_admin     → full access to all tenants
  tenant_admin    → full access within their tenant
  operator        → can view alerts, trigger manual healing
  viewer          → read-only dashboard access
  ai_engineer     → access to MLflow, model management
```

Role enforcement at the API Gateway level using JWT claims, and double-checked at the service level for sensitive operations.

---

## 15. Distributed Tracing & Profiling

### OpenTelemetry Instrumentation

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

# Auto-instrumentation
FastAPIInstrumentor.instrument_app(app)
SQLAlchemyInstrumentor().instrument(engine=engine)

# Manual spans for critical business logic
tracer = trace.get_tracer("data-service")

async def process_anomaly_event(event: AnomalyEvent):
    with tracer.start_as_current_span("process_anomaly") as span:
        span.set_attribute("service.id", event.service_id)
        span.set_attribute("anomaly.score", event.score)
        
        with tracer.start_as_current_span("fetch_service_history"):
            history = await db.get_service_history(event.service_id)
        
        with tracer.start_as_current_span("apply_healing_action"):
            result = await healing_orchestrator.heal(event)
            span.set_attribute("healing.action", result.action)
```

---

## 16. Advanced Features to Add Progressively

These are optional extensions to add after the core is built, each teaching a new concept:

### Phase 3 Features

**Service Mesh with Istio:** Replace manual mTLS setup with Istio sidecar proxies. Traffic management, canary deployments, and retry policies become declarative YAML instead of code.

**Canary Deployment Engine:** When deploying a new version, the Healing Orchestrator routes 5% of traffic to the new version, monitors error rate for 10 minutes, and either promotes to 100% or rolls back automatically.

**Distributed Rate Limiting with Redis Cluster:** Current token bucket is per-instance. Upgrade to a Redis Cluster-backed sliding window that's consistent across all Gateway instances.

**GraphQL Federation:** Add a GraphQL gateway that stitches together schemas from User Service and Data Service. Apollo Federation supergraph.

**Webhook System:** Let tenants register webhooks for anomaly events. The Notification Service delivers signed payloads to tenant endpoints with retry and delivery tracking.

**Log Anomaly Detection:** Run a separate lightweight model (LogBERT or simple n-gram model) on the log stream to detect unusual log patterns — not just metrics anomalies.

**SLA Tracker:** Compute per-service SLA (99.9% = 8.7 hours downtime/year). Dashboard shows current SLA burn rate. Alert when burn rate is too fast.

**Cost Attribution:** Instrument Kubernetes resource usage per tenant. Generate monthly cost attribution reports (GCP/AWS pricing formula applied to CPU/memory hours consumed).

---

## 17. Implementation Roadmap

### Phase 1 — Foundation (Weeks 1-3)

- Set up monorepo with Docker Compose
- Implement API Gateway with rate limiting and JWT validation
- Build Auth Service with JWT + refresh tokens
- Build User Service and Data Service (basic CRUD)
- Set up PostgreSQL + TimescaleDB
- Set up Kafka with basic producer/consumer
- Set up Redis
- Write unit tests for all services

**Milestone:** All services running locally, authenticated API calls working end-to-end.

### Phase 2 — Observability (Weeks 4-5)

- Instrument all services with OpenTelemetry
- Set up Prometheus scraping all `/metrics` endpoints
- Set up Grafana with default dashboards
- Set up Loki + Promtail for log aggregation
- Set up Jaeger for trace visualization
- Configure Alertmanager with Slack webhook
- Add structured logging to all services

**Milestone:** Full observability — can trace a request from Gateway to DB across Jaeger.

### Phase 3 — AI Layer (Weeks 6-8)

- Generate synthetic telemetry data for model training
- Train Isolation Forest and LSTM models
- Build AI Service with FastAPI + gRPC endpoint
- Build Metrics Aggregator (Kafka consumer → sliding window → AI Service)
- Integrate MLflow for experiment tracking
- Write inference tests with known anomaly scenarios

**Milestone:** Anomaly detection firing on injected failures with >80% precision.

### Phase 4 — Healing Orchestrator (Weeks 9-10)

- Implement circuit breaker (state machine: Closed/Open/Half-Open)
- Implement auto-restart via Docker API / Kubernetes API
- Implement traffic rerouting (update Redis routing table)
- Build Root Cause Analyzer
- Build Notification Service with Slack integration
- Implement Chaos Engine (kill, latency, partition)

**Milestone:** System detects a killed service, reroutes traffic, restarts service, and sends Slack alert — all within 30 seconds.

### Phase 5 — Dashboard & Kubernetes (Weeks 11-13)

- Build React dashboard (service health map, anomaly feed, scaling history)
- Add WebSocket real-time updates
- Write Helm charts for all services
- Set up GitHub Actions CI/CD pipeline
- Add Trivy security scanning
- Deploy to Minikube / kind locally, verify all features work in K8s
- Write load tests with k6

**Milestone:** Full system running in Kubernetes, CI/CD pipeline green, load tests passing.

### Phase 6 — Polish (Weeks 14-15)

- Add Vault secrets management
- Add mTLS between services
- Add multi-tenancy with row-level security
- Add predictive auto-scaling
- Write comprehensive README with architecture diagram and demo GIF
- Record a 5-minute demo video

**Milestone:** Portfolio-ready. Demo all features to a friend without notes.

---

## 18. Repository Structure

```
neuralmesh/
├── README.md                        # Architecture diagram, quickstart, demo GIF
├── docker-compose.yml               # Full local environment
├── docker-compose.test.yml          # Test environment
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── security-scan.yml
├── helm/
│   └── neuralmesh/                  # Helm chart
├── services/
│   ├── api-gateway/
│   │   ├── Dockerfile
│   │   ├── src/
│   │   ├── kong.yml                 # Kong declarative config
│   │   └── tests/
│   ├── auth-service/
│   ├── user-service/
│   ├── data-service/
│   ├── worker-service/
│   ├── ai-service/
│   │   ├── models/                  # Trained model artifacts
│   │   ├── training/                # Training scripts
│   │   ├── src/
│   │   └── proto/                   # gRPC .proto files
│   ├── notification-service/
│   └── health-monitor/              # Go service
├── observability/
│   ├── prometheus/
│   │   └── prometheus.yml
│   ├── grafana/
│   │   └── dashboards/
│   ├── loki/
│   │   └── loki-config.yaml
│   └── jaeger/
│       └── jaeger-config.yaml
├── chaos/
│   ├── chaos-engine.py
│   └── experiments/                 # YAML-defined chaos scenarios
├── infrastructure/
│   ├── vault/
│   │   └── vault-config.hcl
│   └── kafka/
│       └── topics.sh
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── hooks/
│   └── Dockerfile
├── scripts/
│   ├── seed-data.py                 # Generate synthetic telemetry
│   ├── run-chaos.sh                 # Run a chaos experiment
│   └── demo.sh                      # Full demo script
└── docs/
    ├── architecture.md
    ├── api-reference.md
    ├── deployment.md
    └── chaos-experiments.md
```

---

## 19. How to Demo This in Interviews

### The 3-Minute Verbal Demo

> "NeuralMesh is a self-healing microservices platform. Let me show you the dashboard — you can see 8 services running, each showing their health score. I'll trigger a chaos experiment now — watch what happens when I kill the Data Service."

1. Kill Data Service via Chaos Engine
2. Health Monitor detects it within 5 seconds → Kafka event fires
3. Dashboard shows the node turning red in real time
4. Circuit breaker on Worker Service opens automatically
5. AI anomaly score spikes — LSTM detects the signature
6. Healing Orchestrator restarts the container
7. Traffic reroutes to a cached path during downtime
8. Service comes back up — circuit breaker closes after 3 successful health checks
9. Slack alert sent: "Data Service recovered in 18 seconds"

**Total demo runtime: under 2 minutes.** Script it. Practice it. Every step should be reproducible.

### Things to Mention Without Being Asked

- "The AI model is versioned in MLflow — I can roll back to an older model if the new one produces false positives"
- "Kafka gives us durability — if the Notification Service is down when an anomaly fires, the message is still there when it comes back up"
- "The circuit breaker has three states — it prevents a cascading failure where one service's slowness backs up request queues across the entire system"
- "I wrote a k6 load test that simulates 10,000 concurrent users — the predictive scaler detects the ramp-up 15 minutes before it peaks and pre-scales"

---

## 20. Concepts You'll Learn

### Distributed Systems Theory

- CAP Theorem — NeuralMesh trades Consistency for Availability during a network partition (AP system)
- Eventual Consistency — Kafka consumers process events asynchronously; the system is eventually consistent
- Leader Election — Health Monitor uses etcd for service registry leader election
- Consensus — Kafka replication requires a quorum of ISR (in-sync replicas)

### Systems Design Patterns

- Circuit Breaker — Resilience pattern preventing cascading failures
- Saga Pattern — Multi-step workflows (e.g., healing flow) as a sequence of local transactions with compensating events
- CQRS — Separate read and write models in Data Service
- Event Sourcing — Kafka as the system of record, state derived from event replay
- Sidecar Pattern — Vault Agent as a sidecar, OpenTelemetry Collector as a sidecar
- Bulkhead Pattern — Service pools isolated so one service's slowness doesn't consume all threads

### Backend Engineering Skills

- gRPC protocol buffers and streaming
- Kafka partitioning, consumer groups, offset management
- Redis data structures (sorted sets, hashes, pub/sub)
- PostgreSQL partitioning and query optimization
- TimescaleDB hypertables and continuous aggregates
- JWT RS256 and token rotation patterns

### AI/ML Engineering

- Feature engineering from raw telemetry
- Isolation Forest mathematics and contamination tuning
- LSTM sequence modeling for anomaly detection
- Prophet time-series decomposition (trend + seasonality)
- MLflow experiment tracking and model registry
- Production model monitoring with Evidently AI

### DevOps / Platform Engineering

- Docker multi-stage builds for minimal image size
- Kubernetes RBAC, NetworkPolicy, HPA, resource limits
- Helm chart parameterization across environments
- GitHub Actions matrix builds and Docker layer caching
- Secrets management with Vault dynamic credentials
- Container vulnerability scanning with Trivy

---

*NeuralMesh — built to learn everything, designed to impress anyone.*
