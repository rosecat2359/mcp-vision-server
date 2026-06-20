import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../app.js";
import type { FastifyInstance } from "fastify";

describe("Auth routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.ENCRYPTION_MASTER_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    process.env.JWT_SECRET = "dev-jwt-secret-at-least-32-chars-long!!";
    process.env.JWT_REFRESH_SECRET = "dev-refresh-secret-at-least-32-chars!!";
    process.env.DATABASE_URL = "postgresql://mcp_hub:mcp_hub_dev@localhost:5432/mcp_hub";
    process.env.REDIS_URL = "redis://localhost:6379";
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /api/auth/register creates tenant + user", async () => {
    const email = `test-${Date.now()}@example.com`;
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { name: "Test", email, password: "password123", tenantName: "Test Corp" },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.user.email).toBe(email);
    expect(body.user.role).toBe("Admin");
    expect(body.tenant.name).toBe("Test Corp");
  });

  it("POST /api/auth/register rejects duplicate email", async () => {
    const email = `dup-${Date.now()}@example.com`;
    // First registration
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email, password: "password123", tenantName: "A" },
    });
    // Duplicate
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email, password: "password123", tenantName: "B" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("POST /api/auth/login returns tokens", async () => {
    const email = `login-${Date.now()}@example.com`;
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email, password: "password123", tenantName: "Test" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password: "password123" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
  });

  it("POST /api/auth/login rejects wrong password", async () => {
    const email = `wrong-${Date.now()}@example.com`;
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email, password: "password123", tenantName: "Test" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password: "wrongpassword" },
    });
    expect(res.statusCode).toBe(401);
  });
});
