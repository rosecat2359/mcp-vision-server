import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../app.js";
import type { FastifyInstance } from "fastify";

describe("GET /api/health", () => {
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

  it("returns ok status", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });
});
