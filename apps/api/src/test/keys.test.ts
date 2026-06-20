import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../app.js";
import type { FastifyInstance } from "fastify";

describe("Keys routes", () => {
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

    const email = `keys-${Date.now()}@example.com`;
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

  it("POST /api/keys creates an encrypted key", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/keys",
      headers: auth(),
      payload: { provider: "anthropic", label: "My Key", plainKey: "sk-ant-test-key-12345" },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.keyPreview).toContain("****");
    // encrypted key should NOT contain the plain key
    expect(JSON.stringify(body)).not.toContain("sk-ant-test-key-12345");
  });

  it("POST /api/keys/:id/reveal returns the plain key", async () => {
    // Create first
    const created = await app.inject({
      method: "POST",
      url: "/api/keys",
      headers: auth(),
      payload: { provider: "openai", label: "Reveal", plainKey: "sk-openai-test-key-12345" },
    });
    const { id } = JSON.parse(created.body);

    const res = await app.inject({
      method: "POST",
      url: `/api/keys/${id}/reveal`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.plainKey).toBe("sk-openai-test-key-12345");
  });

  it("GET /api/keys lists keys with masked preview", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/keys",
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items.length).toBeGreaterThanOrEqual(1);
    // 确认 keyPreview 已脱敏
    body.items.forEach((key: Record<string, unknown>) => {
      expect(key.keyPreview).not.toContain("sk-openai-test-key");
    });
  });
});
