const { createProxyMiddleware, fixRequestBody } = require("http-proxy-middleware");

const DEFAULT_ROUTES = [
  { prefix: "/api/v1/auth", target: process.env.AUTH_SERVICE_URL || "http://localhost:3001", prepend: "/auth" },
  { prefix: "/api/v1/users", target: process.env.USER_SERVICE_URL || "http://localhost:3002", prepend: "/users" },
  { prefix: "/api/v1/data", target: process.env.DATA_SERVICE_URL || "http://localhost:8001" },
  { prefix: "/api/v1/jobs", target: process.env.WORKER_SERVICE_URL || "http://localhost:8002" },
  { prefix: "/api/v1/ai", target: process.env.AI_SERVICE_URL || "http://localhost:8003" },
  { prefix: "/api/v1/metrics", target: process.env.METRICS_AGGREGATOR_URL || "http://localhost:8004" },
  { prefix: "/api/v1/healing", target: process.env.HEALING_ORCHESTRATOR_URL || "http://localhost:8005" },
  { prefix: "/api/v1/chaos", target: process.env.CHAOS_SERVICE_URL || "http://localhost:8006" },
  { prefix: "/api/v1/notifications", target: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3003" },
  { prefix: "/api/v1/health-monitor", target: process.env.HEALTH_MONITOR_URL || "http://localhost:8090" }
];

async function getRoutes(redis) {
  const configured = await redis.get("gateway:routes");
  if (!configured) return DEFAULT_ROUTES;
  try {
    return JSON.parse(configured);
  } catch {
    return DEFAULT_ROUTES;
  }
}

function attachProxyRoutes(app, routes) {
  const proxyTimeoutMs = Number(process.env.GATEWAY_PROXY_TIMEOUT_MS || 30000);
  routes.forEach((route) => {
    app.use(
      route.prefix,
      createProxyMiddleware({
        target: route.target,
        changeOrigin: true,
        pathRewrite: route.prepend ? (path) => `${route.prepend}${path === "/" ? "" : path}` : undefined,
        proxyTimeout: proxyTimeoutMs,
        timeout: proxyTimeoutMs,
        on: {
          proxyReq: (proxyReq, req) => {
            if (req.requestId) proxyReq.setHeader("X-Request-ID", req.requestId);
            if (req.user?.sub) proxyReq.setHeader("X-User-ID", req.user.sub);
            if (req.user?.tenant_id) proxyReq.setHeader("X-Tenant-ID", req.user.tenant_id);
            if (req.user?.roles) proxyReq.setHeader("X-User-Roles", req.user.roles.join(","));
            fixRequestBody(proxyReq, req);
          },
          error: (_err, _req, res) => {
            if (!res.headersSent) {
              res.status(502).json({ error: "upstream_unavailable", service: route.target });
            }
          }
        }
      })
    );
  });
}

module.exports = { DEFAULT_ROUTES, getRoutes, attachProxyRoutes };
