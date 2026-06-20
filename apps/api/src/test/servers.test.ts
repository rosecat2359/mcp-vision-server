import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../app.js";
import type { FastifyInstance } from "fastify";

describe("Servers routes", () => {
  let app: FastifyInstance;
  let accessToken: string;

  beforeAll(async () => {
    process.env.ENCRYPTION_MASTER_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    process.env.JWT_SECRET = "dev-jwt-secret-at-least-32-chars-long!!";
    process.env.JWT_REFRESH_SECRET = "dev-refresh-secret-at-least-32-chars!!";
    process.env.DATABASE_URL = "postgresql://mcp_hub:mcp_hub_dev@localhost:5432/mcp_hub";
    process.env.REDIS_URL = "redis://localhost:6379";
    app = await buildApp();
    await app.ready();

    // Register and get token
    const email = `srv-${Date.now()}@example.com`;
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email, password: "password123", tenantName: "Test" },
    });
    accessToken = JSON.parse(res.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  it("POST /api/servers creates a server", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/servers",
      headers: auth(),
      payload: {
        name: "test-server",
        transport: "sse",
        endpoint: "https://mcp.example.com/sse",
        authType: "bearer",
        tags: ["production"],
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.name).toBe("test-server");
    expect(body.status).toBe("offline");
    expect(body.tags).toContain("production");
  });

  it("GET /api/servers lists servers", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/servers",
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/servers/:id returns server detail", async () => {
    // First create
    const created = await app.inject({
      method: "POST",
      url: "/api/servers",
      headers: auth(),
      payload: { name: "detail-test", transport: "sse", endpoint: "https://test.com/sse", authType: "none" },
    });
    const { id } = JSON.parse(created.body);

    const res = await app.inject({
      method: "GET",
      url: `/api/servers/${id}`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.name).toBe("detail-test");
  });

  it("PATCH /api/servers/:id updates a server", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/servers",
      headers: auth(),
      payload: { name: "patch-test", transport: "sse", endpoint: "https://test.com/sse", authType: "none" },
    });
    const { id } = JSON.parse(created.body);

    const res = await app.inject({
      method: "PATCH",
      url: `/api/servers/${id}`,
      headers: auth(),
      payload: { name: "patched-name", tags: ["updated"] },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.name).toBe("patched-name");
    expect(body.tags).toContain("updated");
  });

  it("DELETE /api/servers/:id deletes a server", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/servers",
      headers: auth(),
      payload: { name: "delete-test", transport: "sse", endpoint: "https://test.com/sse", authType: "none" },
    });
    const { id } = JSON.parse(created.body);

    const res = await app.inject({
      method: "DELETE",
      url: `/api/servers/${id}`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(204);
  });

  it("POST /api/servers/:id/ping returns ping result", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/servers",
      headers: auth(),
      payload: { name: "ping-test", transport: "sse", endpoint: "https://test.com/sse", authType: "none" },
    });
    const { id } = JSON.parse(created.body);

    const res = await app.inject({
      method: "POST",
      url: `/api/servers/${id}/ping`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(["online", "offline", "error"]).toContain(body.status);
    expect(typeof body.latencyMs).toBe("number");
  });

  it("GET /api/servers/:id/logs returns logs", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/servers",
      headers: auth(),
      payload: { name: "logs-test", transport: "sse", endpoint: "https://test.com/sse", authType: "none" },
    });
    const { id } = JSON.parse(created.body);

    const res = await app.inject({
      method: "GET",
      url: `/api/servers/${id}/logs`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body.items)).toBe(true);
  });
});
