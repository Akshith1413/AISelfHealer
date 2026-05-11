const request = require("supertest");
const { createApp, history, dedupe } = require("../src/server");

test("deduplicates repeated alerts inside five minute window", async () => {
  history.length = 0;
  dedupe.clear();
  const app = createApp();
  const payload = { service_id: "data-service", severity: "critical", message: "p99 latency high" };
  const first = await request(app).post("/notifications/test").send(payload);
  const second = await request(app).post("/notifications/test").send(payload);
  expect(first.status).toBe(201);
  expect(second.status).toBe(202);
  expect(second.body.status).toBe("deduped");
});

