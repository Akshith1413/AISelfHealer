async function checkRateLimit(redis, userId, limit = 100, windowSeconds = 60) {
  const key = `rate:${userId}`;
  const now = Date.now();

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, now - windowSeconds * 1000);
  pipeline.zadd(key, now, `${now}-${Math.random()}`);
  pipeline.zcard(key);
  pipeline.expire(key, windowSeconds);

  const results = await pipeline.exec();
  const requestCount = results[2][1];

  return {
    allowed: requestCount <= limit,
    remaining: Math.max(0, limit - requestCount),
    reset: Math.ceil((now + windowSeconds * 1000) / 1000)
  };
}

function rateLimitMiddleware(redis, options = {}) {
  const limit = Number(options.limit ?? process.env.RATE_LIMIT_PER_MINUTE ?? 120);
  const windowSeconds = Number(options.windowSeconds ?? 60);

  return async (req, res, next) => {
    const identity = req.user?.sub || req.ip || "anonymous";
    const result = await checkRateLimit(redis, identity, limit, windowSeconds);
    res.setHeader("X-RateLimit-Remaining", result.remaining);
    res.setHeader("X-RateLimit-Reset", result.reset);

    if (!result.allowed) {
      return res.status(429).json({
        error: "rate_limit_exceeded",
        message: "Token bucket exhausted for this window",
        reset: result.reset
      });
    }
    return next();
  };
}

module.exports = { checkRateLimit, rateLimitMiddleware };

