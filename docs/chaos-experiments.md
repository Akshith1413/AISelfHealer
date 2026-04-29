# Chaos Experiments

| Experiment | Endpoint Payload | Expected Recovery |
|---|---|---|
| Pod Kill | `{ "experiment": "pod_kill", "service_name": "data-service" }` | Health Monitor detects down, circuit opens, healing completes |
| Network Latency | `{ "experiment": "network_latency", "delay_ms": 1200 }` | P99 spike, anomaly event, circuit breaker opens |
| Network Partition | `{ "experiment": "network_partition" }` | Fallback path and reroute flag |
| CPU Stress | `{ "experiment": "cpu_stress" }` | Predictive scaler recommends more replicas |
| Memory Leak | `{ "experiment": "memory_leak" }` | Restart workflow and alert |
| Kafka Partition Loss | `{ "experiment": "kafka_partition_loss" }` | Consumer rebalance and replay |
| DB Connection Exhaustion | `{ "experiment": "db_connection_exhaustion" }` | RCA points to database pool pressure |
| DNS Failure | `{ "experiment": "dns_failure" }` | Retry/fallback endpoint path |

The default local mode is dry-run. Set `CHAOS_ALLOW_DESTRUCTIVE=true` only inside a disposable environment.

