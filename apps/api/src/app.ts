import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import rateLimitPlugin from "@fastify/rate-limit";
import { AppError } from "./lib/errors.js";
import { getEnv } from "./env.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { serversRoutes } from "./modules/servers/servers.routes.js";
import { keysRoutes } from "./modules/keys/keys.routes.js";
import { logsRoutes } from "./modules/logs/logs.routes.js";
import { connectRoutes } from "./modules/connect/connect.routes.js";
import { corsSetup } from "./plugins/cors.js";
import { rateLimitSetup } from "./plugins/rate-limit.js";
import { websocketRoutes } from "./plugins/websocket.js";

export async function buildApp(): Promise<FastifyInstance> {
  const env = getEnv();
  const app = Fastify({
    logger: env.NODE_ENV === "development"
      ? { level: "info" }
      : true,
  });

  // 全局错误处理
  app.setErrorHandler((err, _request, reply) => {
    const error = err as Error & { validation?: unknown };
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(error.toJSON());
    }

    // 处理 Fastify validation 错误
    if ("validation" in error && error.validation) {
      return reply.status(422).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "请求参数错误",
          details: error.validation,
        },
      });
    }

    // 未知错误
    app.log.error(error);
    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: env.NODE_ENV === "production" ? "服务器内部错误" : error.message,
      },
    });
  });

  // 健康检查
  app.get("/api/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // 安全插件
  await app.register(helmet, {
    contentSecurityPolicy: false, // 由 API 网关处理
    hsts: { maxAge: 63072000, includeSubDomains: true },
  });
  await corsSetup(app);
  await rateLimitSetup(app);

  // WebSocket
  await app.register(websocketRoutes);

  // 注册认证路由 (10 req/min 严格限制)
  await app.register(async (authScope) => {
    await authScope.register(rateLimitPlugin, {
      global: true,
      max: 10,
      timeWindow: "1 minute",
      keyGenerator: (req) => req.ip,
    });
    await authScope.register(authRoutes);
  });

  // 注册 MCP Server 路由
  await app.register(serversRoutes);

  // 注册 API Key 路由
  await app.register(keysRoutes);

  // 注册日志路由
  await app.register(logsRoutes);

  // 注册连接测试路由
  await app.register(connectRoutes);

  return app;
}
