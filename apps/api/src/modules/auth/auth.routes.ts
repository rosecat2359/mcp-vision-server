import type { FastifyInstance } from "fastify";
import { register, login, refresh } from "./auth.service.js";
import type { RegisterInput, LoginInput } from "@mcp-hub/shared";

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/register
  app.post("/api/auth/register", async (request, reply) => {
    const { name, email, password, tenantName } = request.body as RegisterInput;
    if (!email || !password || !tenantName) {
      return reply.status(422).send({
        error: { code: "VALIDATION_ERROR", message: "email, password, tenantName 为必填" },
      });
    }
    if (password.length < 8) {
      return reply.status(422).send({
        error: { code: "VALIDATION_ERROR", message: "密码至少 8 位" },
      });
    }
    const result = await register({ name: name ?? "", email, password, tenantName });
    return reply.status(201).send(result);
  });

  // POST /api/auth/login
  app.post("/api/auth/login", async (request, reply) => {
    const { email, password } = request.body as LoginInput;
    if (!email || !password) {
      return reply.status(422).send({
        error: { code: "VALIDATION_ERROR", message: "email, password 为必填" },
      });
    }
    const result = await login({ email, password });
    return reply.send(result);
  });

  // POST /api/auth/refresh
  app.post("/api/auth/refresh", async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string };
    if (!refreshToken) {
      return reply.status(422).send({
        error: { code: "VALIDATION_ERROR", message: "refreshToken 为必填" },
      });
    }
    const result = await refresh(refreshToken);
    return reply.send(result);
  });

  // POST /api/auth/logout — 客户端直接丢弃 token，服务端无状态
  app.post("/api/auth/logout", async () => {
    return { success: true };
  });
}
