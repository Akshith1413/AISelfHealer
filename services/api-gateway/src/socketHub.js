const { Kafka } = require("kafkajs");

const DASHBOARD_TOPICS = [
  "neuralmesh.anomaly.detected",
  "neuralmesh.healing.started",
  "neuralmesh.healing.complete",
  "neuralmesh.scale.event",
  "neuralmesh.service.health",
  "neuralmesh.chaos.started",
  "neuralmesh.chaos.completed",
  "neuralmesh.notification.sent"
];

function syntheticSnapshot() {
  const services = [
    "api-gateway",
    "auth-service",
    "user-service",
    "data-service",
    "worker-service",
    "ai-service",
    "metrics-aggregator",
    "healing-orchestrator",
    "notification-service",
    "chaos-service",
    "health-monitor"
  ];

  return {
    generated_at: new Date().toISOString(),
    services: services.map((service, index) => ({
      id: service,
      name: service,
      health_score: Math.max(72, 99 - index * 2),
      p99_latency_ms: 80 + index * 18,
      error_rate: Number((index * 0.003).toFixed(3)),
      throughput_rps: 40 + index * 8,
      replicas: service.includes("data") ? 3 : 1,
      status: index > 8 ? "degraded" : "healthy"
    })),
    edges: [
      ["api-gateway", "auth-service"],
      ["api-gateway", "user-service"],
      ["api-gateway", "data-service"],
      ["data-service", "worker-service"],
      ["metrics-aggregator", "ai-service"],
      ["ai-service", "healing-orchestrator"],
      ["healing-orchestrator", "notification-service"],
      ["health-monitor", "healing-orchestrator"]
    ].map(([source, target], index) => ({ source, target, traffic: 20 + index * 10 })),
    anomalies: [
      {
        event_id: "demo-anomaly-1",
        service_id: "data-service",
        score: 0.82,
        anomaly_type: "p99_latency_spike",
        triggered_action: "open_circuit_and_reroute",
        timestamp: new Date(Date.now() - 120000).toISOString()
      }
    ],
    healing: [
      {
        event_id: "demo-healing-1",
        service_id: "data-service",
        action: "restart_container",
        before: "unhealthy",
        after: "healthy",
        model: "isolation_forest+lstm",
        recovery_seconds: 18,
        timestamp: new Date(Date.now() - 90000).toISOString()
      }
    ],
    scaling: [
      { service_id: "data-service", predicted_rps: 420, actual_rps: 380, replicas: 3, accuracy: 0.91 },
      { service_id: "worker-service", predicted_rps: 260, actual_rps: 245, replicas: 2, accuracy: 0.94 }
    ]
  };
}

async function attachSocketHub(io) {
  io.on("connection", (socket) => {
    socket.emit("snapshot", syntheticSnapshot());
  });

  if (!process.env.KAFKA_BROKERS || process.env.NODE_ENV === "test") return;

  const kafka = new Kafka({
    clientId: "api-gateway-dashboard-hub",
    brokers: process.env.KAFKA_BROKERS.split(",")
  });
  const consumer = kafka.consumer({ groupId: "api-gateway-dashboard-hub" });

  try {
    await consumer.connect();
    await Promise.all(DASHBOARD_TOPICS.map((topic) => consumer.subscribe({ topic, fromBeginning: false })));
    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        const value = message.value?.toString() || "{}";
        const payload = JSON.parse(value);
        io.emit(topic.replace("neuralmesh.", ""), payload);
      }
    });
  } catch (error) {
    console.warn(JSON.stringify({ level: "warn", service: "api-gateway", message: "Kafka dashboard hub disabled", error: error.message }));
  }
}

module.exports = { attachSocketHub, syntheticSnapshot };

