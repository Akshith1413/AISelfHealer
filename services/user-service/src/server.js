const fastify = require("fastify");
const cors = require("@fastify/cors");
const prom = require("prom-client");
const { randomUUID } = require("crypto");

const store = new Map();

function tenantFrom(req) {
  return req.headers["x-tenant-id"] || "tenant-demo";
}

function createServer() {
  const app = fastify({ logger: true });
  app.register(cors, { origin: true, credentials: true });

  prom.collectDefaultMetrics({ prefix: "user_service_" });
  const requestCounter = new prom.Counter({
    name: "user_service_http_requests_total",
    help: "User service requests",
    labelNames: ["method", "route", "status"]
  });

  app.addHook("onResponse", async (req, reply) => {
    requestCounter.inc({ method: req.method, route: req.routeOptions.url || req.url, status: String(reply.statusCode) });
  });

  app.get("/health", async () => ({ status: "ok", service: "user-service" }));
  app.get("/metrics", async (_req, reply) => {
    reply.header("Content-Type", prom.register.contentType);
    return prom.register.metrics();
  });

  app.get("/users", async (req) => {
    const tenantId = tenantFrom(req);
    return {
      users: [...store.values()].filter((user) => user.tenant_id === tenantId && !user.deleted_at)
    };
  });

  app.post("/users", async (req, reply) => {
    const tenantId = tenantFrom(req);
    const body = req.body || {};
    const user = {
      id: `profile_${randomUUID()}`,
      tenant_id: tenantId,
      email: body.email,
      name: body.name,
      role: body.role || "viewer",
      metadata: body.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };
    if (!user.email || !user.name) {
      return reply.code(400).send({ error: "email_and_name_required" });
    }
    store.set(user.id, user);
    return reply.code(201).send(user);
  });

  app.get("/users/:id", async (req, reply) => {
    const user = store.get(req.params.id);
    if (!user || user.tenant_id !== tenantFrom(req) || user.deleted_at) {
      return reply.code(404).send({ error: "not_found" });
    }
    return user;
  });

  app.patch("/users/:id", async (req, reply) => {
    const user = store.get(req.params.id);
    if (!user || user.tenant_id !== tenantFrom(req) || user.deleted_at) {
      return reply.code(404).send({ error: "not_found" });
    }
    Object.assign(user, req.body || {}, { updated_at: new Date().toISOString() });
    return user;
  });

  app.delete("/users/:id", async (req, reply) => {
    const user = store.get(req.params.id);
    if (!user || user.tenant_id !== tenantFrom(req)) {
      return reply.code(404).send({ error: "not_found" });
    }
    user.deleted_at = new Date().toISOString();
    user.updated_at = user.deleted_at;
    return { status: "deleted", id: user.id };
  });

  app.get("/registry", async () => ({
    service_id: "user-service",
    url: process.env.PUBLIC_URL || "http://user-service:3002",
    endpoints: ["/users", "/users/:id", "/health", "/metrics"],
    heartbeat_at: new Date().toISOString()
  }));

  return app;
}

async function start() {
  const app = createServer();
  await app.listen({ port: Number(process.env.PORT || 3002), host: "0.0.0.0" });
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { createServer, store };

