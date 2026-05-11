const cors = require("cors");
const express = require("express");
const prom = require("prom-client");
const nodemailer = require("nodemailer");
const { randomUUID } = require("crypto");
const { Kafka } = require("kafkajs");

const history = [];
const dedupe = new Map();

function isDuplicate(alert, windowMs = 5 * 60 * 1000) {
  const key = `${alert.service_id}:${alert.severity || "info"}:${alert.message || alert.event_type}`;
  const last = dedupe.get(key);
  if (last && Date.now() - last < windowMs) return true;
  dedupe.set(key, Date.now());
  return false;
}

function createTransport() {
  if (!process.env.SMTP_HOST) {
    return nodemailer.createTransport({ jsonTransport: true });
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined
  });
}

async function deliver(alert, transport = createTransport()) {
  if (isDuplicate(alert)) {
    return { status: "deduped", alert };
  }

  const record = {
    id: `notification_${randomUUID()}`,
    tenant_id: alert.tenant_id || "tenant-demo",
    service_id: alert.service_id || "unknown",
    channel: alert.channel || (process.env.SLACK_WEBHOOK_URL ? "slack" : "email-dry-run"),
    severity: alert.severity || "warning",
    message: alert.message || `${alert.event_type || "alert"} for ${alert.service_id || "unknown"}`,
    payload: alert,
    created_at: new Date().toISOString()
  };

  if (record.channel === "slack" && process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: record.message, metadata: record.payload })
    });
  } else if (record.channel.startsWith("email")) {
    await transport.sendMail({
      from: "neuralmesh@localhost",
      to: alert.email || "sre@example.com",
      subject: `[NeuralMesh] ${record.severity}: ${record.service_id}`,
      text: record.message
    });
  } else if (record.channel === "webhook" && alert.webhook_url) {
    await fetch(alert.webhook_url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-neuralmesh-signature": "dev-signature" },
      body: JSON.stringify(record)
    });
  }

  history.unshift(record);
  history.splice(200);
  return { status: "sent", notification: record };
}

async function startKafkaConsumer() {
  if (!process.env.KAFKA_BROKERS || process.env.NODE_ENV === "test") return;
  const kafka = new Kafka({ clientId: "notification-service", brokers: process.env.KAFKA_BROKERS.split(",") });
  const consumer = kafka.consumer({ groupId: "notification-service-alert-router" });
  try {
    await consumer.connect();
    await Promise.all([
      consumer.subscribe({ topic: "neuralmesh.anomaly.detected" }),
      consumer.subscribe({ topic: "neuralmesh.healing.complete" }),
      consumer.subscribe({ topic: "neuralmesh.healing.failed" }),
      consumer.subscribe({ topic: "neuralmesh.chaos.started" })
    ]);
    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        const value = JSON.parse(message.value.toString());
        await deliver({ ...value, event_type: topic.replace("neuralmesh.", "") }).catch(() => undefined);
      }
    });
  } catch (error) {
    console.warn(JSON.stringify({ level: "warn", service: "notification-service", message: "Kafka consumer disabled", error: error.message }));
  }
}

function createApp() {
  const app = express();
  prom.collectDefaultMetrics({ prefix: "notification_service_" });
  const sentCounter = new prom.Counter({ name: "notification_service_sent_total", help: "Notifications sent", labelNames: ["channel", "severity"] });

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "notification-service" }));
  app.get("/metrics", async (_req, res) => {
    res.setHeader("Content-Type", prom.register.contentType);
    res.send(await prom.register.metrics());
  });
  app.get("/notifications/history", (_req, res) => res.json({ notifications: history }));
  app.post("/notifications/test", async (req, res) => {
    const result = await deliver(req.body || {});
    if (result.notification) sentCounter.inc({ channel: result.notification.channel, severity: result.notification.severity });
    res.status(result.status === "deduped" ? 202 : 201).json(result);
  });
  app.post("/notifications", async (req, res) => {
    const result = await deliver(req.body || {});
    if (result.notification) sentCounter.inc({ channel: result.notification.channel, severity: result.notification.severity });
    res.status(result.status === "deduped" ? 202 : 201).json(result);
  });

  return app;
}

async function start() {
  const app = createApp();
  startKafkaConsumer();
  const port = Number(process.env.PORT || 3003);
  app.listen(port, () => console.log(JSON.stringify({ level: "info", service: "notification-service", message: "listening", port })));
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { createApp, deliver, history, dedupe };

