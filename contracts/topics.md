# Kafka Topic Contract

| Topic | Partitions | Replication | Producers | Consumers | Purpose |
|---|---:|---:|---|---|---|
| `neuralmesh.metrics.raw` | 12 | 3 | Services, metrics aggregator seed | AI Service, Metrics Aggregator, Prometheus exporter | Raw telemetry stream |
| `neuralmesh.anomaly.detected` | 4 | 3 | AI Service, Metrics Aggregator | Healing Orchestrator, Notification, Dashboard | Anomaly signals |
| `neuralmesh.healing.started` | 4 | 3 | Healing Orchestrator | Dashboard, Audit Logger | Healing action started |
| `neuralmesh.healing.complete` | 4 | 3 | Healing Orchestrator | Dashboard, Metrics, Notification | Recovery finished |
| `neuralmesh.healing.failed` | 4 | 3 | Healing Orchestrator | Dashboard, Notification | Recovery failed |
| `neuralmesh.scale.event` | 4 | 3 | AI Service, Healing Orchestrator | Dashboard, Audit | Predictive scaling action |
| `neuralmesh.service.health` | 4 | 3 | Health Monitor | Dashboard, AI, Healing | Health scores |
| `neuralmesh.service.down` | 4 | 3 | Health Monitor | Healing, Notification, Dashboard | Failed health checks |
| `neuralmesh.notification.sent` | 4 | 3 | Notification Service | Audit, Dashboard | Delivery audit |
| `neuralmesh.chaos.started` | 2 | 3 | Chaos Service | Dashboard, Notification | Chaos experiment started |
| `neuralmesh.chaos.completed` | 2 | 3 | Chaos Service | Dashboard, Notification | Chaos experiment completed |
| `neuralmesh.audit` | 1 | 3 | All services | Audit DB Writer | Immutable audit trail |

