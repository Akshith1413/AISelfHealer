const http = require("http");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const morgan = require("morgan");
const prom = require("prom-client");
const Redis = require("ioredis");
const { Server } = require("socket.io");
const { randomUUID } = require("crypto");

const { MemoryRedis } = require("./memoryRedis");
const { rateLimitMiddleware } = require("./rateLimit");
const { requireJwt, requireRole, loadPublicKey } = require("./auth");
const { attachProxyRoutes, getRoutes } = require("./routing");
const { attachSocketHub, syntheticSnapshot } = require("./socketHub");

function createRedis() {
  if (process.env.NODE_ENV === "test" || process.env.DISABLE_REDIS === "true") {
    return new MemoryRedis();
  }
  const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379/0", {
    lazyConnect: true,
    maxRetriesPerRequest: 1
  });
  redis.connect().catch((error) => {
    console.warn(JSON.stringify({ level: "warn", service: "api-gateway", message: "Redis unavailable, continuing with degraded cache", error: error.message }));
  });
  return redis;
}

async function createApp() {
  const app = express();
  const redis = createRedis();
  const publicKeyPromise = loadPublicKey();

  prom.collectDefaultMetrics({ prefix: "api_gateway_" });
  const requests = new prom.Counter({
    name: "api_gateway_http_requests_total",
    help: "Total API Gateway requests",
    labelNames: ["method", "route", "status"]
  });
  const latency = new prom.Histogram({
    name: "api_gateway_http_request_duration_seconds",
    help: "API Gateway request duration",
    labelNames: ["route"]
  });

  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use(morgan("combined"));
  app.use((req, res, next) => {
    req.requestId = req.headers["x-request-id"] || randomUUID();
    res.setHeader("X-Request-ID", req.requestId);
    const end = latency.startTimer({ route: req.path });
    res.on("finish", () => {
      end();
      requests.inc({ method: req.method, route: req.path, status: String(res.statusCode) });
    });
    next();
  });
  app.use(requireJwt(publicKeyPromise));
  app.use(rateLimitMiddleware(redis));

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "api-gateway" }));
  app.get("/ready", (_req, res) => res.json({ status: "ready", redis: "configured" }));
  app.get("/metrics", async (_req, res) => {
    res.setHeader("Content-Type", prom.register.contentType);
    res.send(await prom.register.metrics());
  });

  app.get("/api/v1/dashboard/snapshot", (_req, res) => res.json(syntheticSnapshot()));
  app.get("/api/v1/routes", requireRole("super_admin", "operator"), async (_req, res) => {
    res.json({ routes: await getRoutes(redis) });
  });
  app.put("/api/v1/routes", express.json({ limit: "1mb" }), requireRole("super_admin"), async (req, res) => {
    await redis.set("gateway:routes", JSON.stringify(req.body.routes || []), "EX", 3600);
    res.json({ status: "updated", routes: req.body.routes || [] });
  });

  attachProxyRoutes(app, await getRoutes(redis));

  app.use((req, res) => {
    res.status(404).json({ error: "not_found", path: req.path });
  });

  return { app, redis };
}

async function start() {
  const { app } = await createApp();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: true, credentials: true } });
  attachSocketHub(io).catch((error) => {
    console.warn(JSON.stringify({ level: "warn", service: "api-gateway", message: "dashboard hub failed", error: error.message }));
  });
  const port = Number(process.env.PORT || 8080);
  server.listen(port, () => {
    console.log(JSON.stringify({ level: "info", service: "api-gateway", message: "listening", port }));
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { createApp };
