export const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:8080";
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || GATEWAY_URL;
export const GRAFANA_URL = import.meta.env.VITE_GRAFANA_URL || "http://localhost:3000";

export const fallbackSnapshot = {
  generated_at: new Date().toISOString(),
  services: [
    { id: "api-gateway", name: "api-gateway", health_score: 98, p99_latency_ms: 86, error_rate: 0.002, throughput_rps: 120, replicas: 2, status: "healthy" },
    { id: "auth-service", name: "auth-service", health_score: 96, p99_latency_ms: 64, error_rate: 0.001, throughput_rps: 84, replicas: 2, status: "healthy" },
    { id: "user-service", name: "user-service", health_score: 94, p99_latency_ms: 91, error_rate: 0.004, throughput_rps: 96, replicas: 2, status: "healthy" },
    { id: "data-service", name: "data-service", health_score: 78, p99_latency_ms: 420, error_rate: 0.041, throughput_rps: 310, replicas: 3, status: "degraded" },
    { id: "worker-service", name: "worker-service", health_score: 87, p99_latency_ms: 150, error_rate: 0.011, throughput_rps: 180, replicas: 2, status: "healthy" },
    { id: "ai-service", name: "ai-service", health_score: 91, p99_latency_ms: 210, error_rate: 0.008, throughput_rps: 48, replicas: 1, status: "healthy" },
    { id: "metrics-aggregator", name: "metrics-aggregator", health_score: 89, p99_latency_ms: 134, error_rate: 0.006, throughput_rps: 260, replicas: 2, status: "healthy" },
    { id: "healing-orchestrator", name: "healing-orchestrator", health_score: 92, p99_latency_ms: 105, error_rate: 0.003, throughput_rps: 34, replicas: 1, status: "healthy" },
    { id: "notification-service", name: "notification-service", health_score: 84, p99_latency_ms: 188, error_rate: 0.014, throughput_rps: 40, replicas: 1, status: "healthy" },
    { id: "chaos-service", name: "chaos-service", health_score: 99, p99_latency_ms: 72, error_rate: 0, throughput_rps: 6, replicas: 1, status: "healthy" }
  ],
  edges: [
    { source: "api-gateway", target: "auth-service", traffic: 85 },
    { source: "api-gateway", target: "user-service", traffic: 70 },
    { source: "api-gateway", target: "data-service", traffic: 120 },
    { source: "data-service", target: "worker-service", traffic: 58 },
    { source: "metrics-aggregator", target: "ai-service", traffic: 95 },
    { source: "ai-service", target: "healing-orchestrator", traffic: 28 },
    { source: "healing-orchestrator", target: "notification-service", traffic: 24 }
  ],
  anomalies: [
    { event_id: "a1", service_id: "data-service", score: 0.84, anomaly_type: "latency_spike", triggered_action: "restart_or_reroute", timestamp: new Date().toISOString() }
  ],
  healing: [
    { event_id: "h1", service_id: "data-service", action: "restart_container", before: "degraded", after: "healthy", recovery_seconds: 18, model: "isolation_forest+lstm", timestamp: new Date().toISOString() }
  ],
  scaling: [
    { service_id: "data-service", predicted_rps: 430, actual_rps: 390, replicas: 3, accuracy: 0.91 },
    { service_id: "worker-service", predicted_rps: 260, actual_rps: 245, replicas: 2, accuracy: 0.94 }
  ]
};

export async function getSnapshot() {
  try {
    const response = await fetch(`${GATEWAY_URL}/api/v1/dashboard/snapshot`);
    if (!response.ok) throw new Error(`Gateway returned ${response.status}`);
    return response.json();
  } catch {
    return fallbackSnapshot;
  }
}

export async function triggerChaos(experiment, serviceName) {
  const response = await fetch(`${GATEWAY_URL}/api/v1/chaos/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ experiment, service_name: serviceName, dry_run: true })
  });
  if (!response.ok) throw new Error("Chaos request failed");
  return response.json();
}

