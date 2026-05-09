const request = require("supertest");
const { createApp } = require("../src/server");

test("register, login, and refresh rotate tokens", async () => {
  const { app } = await createApp();
  const register = await request(app).post("/auth/register").send({ email: "demo@example.com", password: "Passw0rd!" });
  expect(register.status).toBe(201);
  expect(register.body.accessToken).toBeTruthy();

  const login = await request(app).post("/auth/login").send({ email: "demo@example.com", password: "Passw0rd!" });
  expect(login.status).toBe(200);
  expect(login.body.refreshToken).toBeTruthy();

  const refresh = await request(app).post("/auth/refresh").send({ refreshToken: login.body.refreshToken });
  expect(refresh.status).toBe(200);
  expect(refresh.body.refreshToken).not.toBe(login.body.refreshToken);
});

