const fs = require("fs");
const { createPublicKey } = require("crypto");
const { jwtVerify, importSPKI } = require("jose");

const PUBLIC_ROUTES = [
  /^\/health$/,
  /^\/ready$/,
  /^\/metrics$/,
  /^\/api\/v1\/auth\/(login|register|refresh|public-key|\.well-known\/jwks\.json)/,
  /^\/api\/v1\/dashboard\/snapshot$/
];

function isPublicRoute(path) {
  return PUBLIC_ROUTES.some((pattern) => pattern.test(path));
}

async function loadPublicKey() {
  const inline = process.env.JWT_PUBLIC_KEY;
  const path = process.env.JWT_PUBLIC_KEY_PATH;
  const url = process.env.JWT_PUBLIC_KEY_URL;
  if (inline) return importSPKI(inline.replace(/\\n/g, "\n"), "RS256");
  if (path && fs.existsSync(path)) {
    return importSPKI(fs.readFileSync(path, "utf8"), "RS256");
  }
  if (url && typeof fetch === "function") {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return importSPKI(await response.text(), "RS256");
        }
      } catch {
        // Auth may still be starting. Retry briefly before falling back to dev behavior/error.
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (process.env.NODE_ENV === "test" || process.env.ALLOW_DEV_UNSIGNED_JWT === "true") {
    return null;
  }
  throw new Error("JWT public key not configured. Set JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_PATH.");
}

function extractToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);
  return req.cookies?.access_token || null;
}

function requireJwt(publicKeyPromise) {
  return async (req, res, next) => {
    if (isPublicRoute(req.path)) return next();
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "missing_token" });
    }

    try {
      const publicKey = await publicKeyPromise;
      if (!publicKey) {
        req.user = { sub: "dev-user", tenant_id: "tenant-demo", roles: ["super_admin"] };
        return next();
      }
      const verified = await jwtVerify(token, publicKey, {
        issuer: process.env.JWT_ISSUER || "neuralmesh-auth",
        audience: process.env.JWT_AUDIENCE || "neuralmesh"
      });
      req.user = verified.payload;
      req.headers["x-user-id"] = verified.payload.sub;
      req.headers["x-tenant-id"] = verified.payload.tenant_id;
      req.headers["x-user-roles"] = (verified.payload.roles || []).join(",");
      return next();
    } catch (error) {
      return res.status(401).json({ error: "invalid_token", message: error.message });
    }
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    if (userRoles.includes("super_admin") || roles.some((role) => userRoles.includes(role))) {
      return next();
    }
    return res.status(403).json({ error: "forbidden", required_roles: roles });
  };
}

module.exports = { requireJwt, requireRole, loadPublicKey, isPublicRoute, extractToken };
