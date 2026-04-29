# API Reference

All external calls should go through `http://localhost:8080`.

| API | Method | Path | Purpose |
|---|---|---|---|
| Auth | POST | `/api/v1/auth/register` | Create a local user and issue tokens |
| Auth | POST | `/api/v1/auth/login` | Issue RS256 access token and refresh cookie |
| Auth | POST | `/api/v1/auth/refresh` | Rotate refresh token |
| Users | GET/POST | `/api/v1/users` | Tenant-aware user profiles |
| Data | POST | `/api/v1/data/commands/service-metrics` | CQRS metric write path with idempotency |
| Data | GET | `/api/v1/data/queries/service-metrics` | Read model query path |
| Worker | POST | `/api/v1/jobs/workers/jobs` | Submit priority background job |
| Worker | GET | `/api/v1/jobs/workers/status` | Queue depth, active, failed, completed jobs |
| AI | POST | `/api/v1/ai/score` | Score telemetry window |
| AI | POST | `/api/v1/ai/predict-scale` | Predict required replicas |
| AI | POST | `/api/v1/ai/root-cause` | Graph-based RCA |
| Metrics | POST | `/api/v1/metrics/telemetry` | Add telemetry to sliding window |
| Healing | POST | `/api/v1/healing/events/anomaly` | Trigger healing workflow |
| Chaos | POST | `/api/v1/chaos/run` | Run safe chaos experiment |
| Notifications | GET | `/api/v1/notifications/notifications/history` | Notification audit history |
| Dashboard | GET | `/api/v1/dashboard/snapshot` | Service graph and demo state |

JWT claims include `sub`, `tenant_id`, `roles`, and `permissions`. Services also accept `X-Tenant-ID` from the gateway for tenant isolation.

