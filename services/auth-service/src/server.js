const fs = require("fs");
const { generateKeyPairSync, randomUUID } = require("crypto");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const Redis = require("ioredis");
const { exportJWK, importPKCS8, importSPKI, SignJWT } = require("jose");
const { Kafka } = require("kafkajs");
const prom = require("prom-client");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const { TokenStore } = require("./tokenStore");
const { permissionsFor } = require("./rbac");

const users = new Map();

function createRedis() {
  if (process.env.NODE_ENV === "test" || process.env.DISABLE_REDIS === "true") return null;
  const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379/0", { lazyConnect: true, maxRetriesPerRequest: 1 });
  redis.connect().catch(() => undefined);
  return redis;
}

function readOrCreateKeys() {
  const privatePath = process.env.JWT_PRIVATE_KEY_PATH;
  const publicPath = process.env.JWT_PUBLIC_KEY_PATH;
  if (privatePath && publicPath && fs.existsSync(privatePath) && fs.existsSync(publicPath)) {
    return {
      privatePem: fs.readFileSync(privatePath, "utf8"),
      publicPem: fs.readFileSync(publicPath, "utf8")
    };
  }
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    privatePem: privateKey.export({ type: "pkcs8", format: "pem" }),
    publicPem: publicKey.export({ type: "spki", format: "pem" })
  };
}

async function createKafkaProducer() {
  if (!process.env.KAFKA_BROKERS || process.env.NODE_ENV === "test") return null;
  const kafka = new Kafka({ clientId: "auth-service", brokers: process.env.KAFKA_BROKERS.split(",") });
  const producer = kafka.producer();
  try {
    await producer.connect();
    return producer;
  } catch {
    return null;
  }
}

async function createApp() {
  const app = express();
  const redis = createRedis();
  const tokenStore = new TokenStore(redis);
  const { privatePem, publicPem } = readOrCreateKeys();
  const privateKey = await importPKCS8(privatePem, "RS256");
  const publicJwk = await exportJWK(await importSPKI(publicPem, "RS256"));
  publicJwk.use = "sig";
  publicJwk.alg = "RS256";
  publicJwk.kid = "neuralmesh-dev-key";
  const producer = await createKafkaProducer();

  prom.collectDefaultMetrics({ prefix: "auth_service_" });
  const authCounter = new prom.Counter({ name: "auth_service_events_total", help: "Auth events", labelNames: ["type"] });

  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());
  app.use(passport.initialize());

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/oauth/google/callback"
    }, (_accessToken, _refreshToken, profile, done) => done(null, profile)));
  }

  async function emitAuthEvent(eventType, user, req) {
    authCounter.inc({ type: eventType });
    const event = {
      event_id: randomUUID(),
      event_type: "user.auth",
      service_id: "auth-service",
      tenant_id: user.tenant_id,
      payload: { action: eventType, user_id: user.id, email: user.email, ip: req.ip },
      timestamp: new Date().toISOString(),
      causation_id: null,
      correlation_id: req.headers["x-request-id"] || randomUUID()
    };
    if (producer) {
      await producer.send({ topic: "neuralmesh.audit", messages: [{ key: user.id, value: JSON.stringify(event) }] }).catch(() => undefined);
    }
    return event;
  }

  async function issueTokens(user) {
    const now = Math.floor(Date.now() / 1000);
    const accessTtl = Number(process.env.JWT_ACCESS_TTL_SECONDS || 900);
    const refreshTtl = Number(process.env.JWT_REFRESH_TTL_SECONDS || 604800);
    const refreshTokenId = randomUUID();
    await tokenStore.saveRefreshToken({
      tokenId: refreshTokenId,
      userId: user.id,
      tenantId: user.tenant_id,
      expiresAt: Date.now() + refreshTtl * 1000
    });
    const accessToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      tenant_id: user.tenant_id,
      roles: user.roles,
      permissions: permissionsFor(user.roles)
    })
      .setProtectedHeader({ alg: "RS256", kid: "neuralmesh-dev-key" })
      .setIssuer(process.env.JWT_ISSUER || "neuralmesh-auth")
      .setAudience(process.env.JWT_AUDIENCE || "neuralmesh")
      .setIssuedAt(now)
      .setExpirationTime(now + accessTtl)
      .sign(privateKey);
    return { accessToken, refreshToken: refreshTokenId, expiresIn: accessTtl };
  }

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "auth-service" }));
  app.get("/metrics", async (_req, res) => {
    res.setHeader("Content-Type", prom.register.contentType);
    res.send(await prom.register.metrics());
  });
  app.get("/auth/public-key", (_req, res) => res.type("text/plain").send(publicPem));
  app.get("/auth/.well-known/jwks.json", (_req, res) => res.json({ keys: [publicJwk] }));
  app.get("/auth/oauth/google", (_req, res) => {
    res.json({ status: "configured", enabled: Boolean(process.env.GOOGLE_CLIENT_ID), message: "Use Passport Google OAuth in production credentials mode." });
  });

  app.post("/auth/register", async (req, res) => {
    const { email, password, tenant_id = "tenant-demo", roles = ["tenant_admin"] } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email_and_password_required" });
    if (users.has(email)) return res.status(409).json({ error: "user_exists" });
    const user = {
      id: `user_${randomUUID()}`,
      email,
      tenant_id,
      roles,
      password_hash: await bcrypt.hash(password, 10),
      created_at: new Date().toISOString()
    };
    users.set(email, user);
    const tokens = await issueTokens(user);
    await emitAuthEvent("register", user, req);
    res.cookie("refresh_token", tokens.refreshToken, { httpOnly: true, sameSite: "lax", maxAge: 604800000 });
    res.status(201).json({ user: { id: user.id, email, tenant_id, roles, permissions: permissionsFor(roles) }, ...tokens });
  });

  app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = users.get(email);
    if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
      return res.status(401).json({ error: "invalid_credentials" });
    }
    const tokens = await issueTokens(user);
    await emitAuthEvent("login", user, req);
    res.cookie("refresh_token", tokens.refreshToken, { httpOnly: true, sameSite: "lax", maxAge: 604800000 });
    res.json({ user: { id: user.id, email, tenant_id: user.tenant_id, roles: user.roles, permissions: permissionsFor(user.roles) }, ...tokens });
  });

  app.post("/auth/refresh", async (req, res) => {
    const refreshToken = req.cookies.refresh_token || req.body.refreshToken;
    const session = refreshToken ? await tokenStore.get(refreshToken) : null;
    if (!session) return res.status(401).json({ error: "invalid_refresh_token" });
    const user = [...users.values()].find((candidate) => candidate.id === session.userId);
    if (!user) return res.status(401).json({ error: "session_user_missing" });
    await tokenStore.revoke(refreshToken);
    const tokens = await issueTokens(user);
    await emitAuthEvent("refresh", user, req);
    res.cookie("refresh_token", tokens.refreshToken, { httpOnly: true, sameSite: "lax", maxAge: 604800000 });
    res.json(tokens);
  });

  app.post("/auth/logout", async (req, res) => {
    const refreshToken = req.cookies.refresh_token || req.body.refreshToken;
    if (refreshToken) await tokenStore.revoke(refreshToken);
    res.clearCookie("refresh_token");
    res.json({ status: "logged_out" });
  });

  app.get("/auth/me", (req, res) => {
    res.json({ authenticated: Boolean(req.headers.authorization), hint: "Gateway verifies JWT and forwards X-User-ID/X-Tenant-ID to services." });
  });

  return { app, users };
}

async function start() {
  const { app } = await createApp();
  const port = Number(process.env.PORT || 3001);
  app.listen(port, () => console.log(JSON.stringify({ level: "info", service: "auth-service", message: "listening", port })));
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { createApp };
