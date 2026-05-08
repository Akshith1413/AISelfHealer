class MemoryRedis {
  constructor() {
    this.values = new Map();
    this.sortedSets = new Map();
  }

  _expired(entry) {
    return entry?.expiresAt && entry.expiresAt <= Date.now();
  }

  async get(key) {
    const entry = this.values.get(key);
    if (this._expired(entry)) {
      this.values.delete(key);
      return null;
    }
    return entry?.value ?? null;
  }

  async set(key, value, mode, ttlSeconds) {
    const expiresAt = mode === "EX" && ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.values.set(key, { value, expiresAt });
    return "OK";
  }

  async setex(key, ttlSeconds, value) {
    return this.set(key, value, "EX", ttlSeconds);
  }

  async del(key) {
    this.values.delete(key);
    this.sortedSets.delete(key);
    return 1;
  }

  pipeline() {
    const ops = [];
    const api = {
      zremrangebyscore: (key, min, max) => {
        ops.push(() => this.zremrangebyscore(key, min, max));
        return api;
      },
      zadd: (key, score, member) => {
        ops.push(() => this.zadd(key, score, member));
        return api;
      },
      zcard: (key) => {
        ops.push(() => this.zcard(key));
        return api;
      },
      expire: (key, seconds) => {
        ops.push(() => this.expire(key, seconds));
        return api;
      },
      exec: async () => Promise.all(ops.map(async (op) => [null, await op()]))
    };
    return api;
  }

  async zremrangebyscore(key, min, max) {
    const set = this.sortedSets.get(key) ?? [];
    const next = set.filter((item) => item.score < Number(min) || item.score > Number(max));
    this.sortedSets.set(key, next);
    return set.length - next.length;
  }

  async zadd(key, score, member) {
    const set = this.sortedSets.get(key) ?? [];
    set.push({ score: Number(score), member });
    this.sortedSets.set(key, set);
    return 1;
  }

  async zcard(key) {
    return (this.sortedSets.get(key) ?? []).length;
  }

  async expire() {
    return 1;
  }
}

module.exports = { MemoryRedis };

