const { createServer, store } = require("../src/server");

test("tenant-aware user CRUD", async () => {
  store.clear();
  const app = createServer();
  await app.ready();
  const created = await app.inject({
    method: "POST",
    url: "/users",
    headers: { "x-tenant-id": "tenant-a" },
    payload: { email: "a@example.com", name: "A User" }
  });
  expect(created.statusCode).toBe(201);
  const id = JSON.parse(created.body).id;

  const miss = await app.inject({ method: "GET", url: `/users/${id}`, headers: { "x-tenant-id": "tenant-b" } });
  expect(miss.statusCode).toBe(404);

  const hit = await app.inject({ method: "GET", url: `/users/${id}`, headers: { "x-tenant-id": "tenant-a" } });
  expect(hit.statusCode).toBe(200);
  await app.close();
});

