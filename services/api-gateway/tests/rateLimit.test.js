const { checkRateLimit } = require("../src/rateLimit");
const { MemoryRedis } = require("../src/memoryRedis");

test("token bucket allows within limit and blocks after limit", async () => {
  const redis = new MemoryRedis();
  expect((await checkRateLimit(redis, "user-a", 2, 60)).allowed).toBe(true);
  expect((await checkRateLimit(redis, "user-a", 2, 60)).allowed).toBe(true);
  const third = await checkRateLimit(redis, "user-a", 2, 60);
  expect(third.allowed).toBe(false);
  expect(third.remaining).toBe(0);
});

