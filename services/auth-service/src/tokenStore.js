const { randomUUID } = require("crypto");

class TokenStore {
  constructor(redis) {
    this.redis = redis;
    this.memory = new Map();
    this.blacklist = new Set();
  }

  async saveRefreshToken({ tokenId = randomUUID(), userId, tenantId, expiresAt }) {
    const payload = JSON.stringify({ tokenId, userId, tenantId, expiresAt });
    if (this.redis) {
      await this.redis.set(`session:${tokenId}`, payload, "EX", Math.max(1, Math.floor((expiresAt - Date.now()) / 1000)));
    }
    this.memory.set(tokenId, JSON.parse(payload));
    return tokenId;
  }

  async rotate(oldTokenId, nextSession) {
    await this.revoke(oldTokenId);
    return this.saveRefreshToken(nextSession);
  }

  async get(tokenId) {
    if (this.blacklist.has(tokenId)) return null;
    if (this.redis) {
      const raw = await this.redis.get(`session:${tokenId}`);
      if (raw) return JSON.parse(raw);
    }
    return this.memory.get(tokenId) || null;
  }

  async revoke(tokenId) {
    this.blacklist.add(tokenId);
    this.memory.delete(tokenId);
    if (this.redis) {
      await this.redis.del(`session:${tokenId}`);
      await this.redis.set(`blacklist:${tokenId}`, "1", "EX", 604800);
    }
  }
}

module.exports = { TokenStore };

