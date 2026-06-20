import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { AppError } from "./lib/errors.js";
import { getEnv } from "./env.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { serversRoutes } from "./modules/servers/servers.routes.js";
import { keysRoutes } from "./modules/keys/keys.routes.js";

export async function buildApp(): Promise<FastifyInstance> {
  const env = getEnv();
  const app = Fastify({
    logger: env.NODE_ENV === "development"
      ? { transport: { target: "pino-pretty", options: { colorize: true } } }
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

  // 注册认证路由
  await app.register(authRoutes);

  // 注册 MCP Server 路由
  await app.register(serversRoutes);

  // 注册 API Key 路由
  await app.register(keysRoutes);

  return app;
}
