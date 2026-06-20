import rateLimitPlugin from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

/**
 * 全局 API 速率限制: 100 req/min
 * Auth 路由更严格的 10 req/min 限制由 app.ts 中的子作用域处理
 */
export async function rateLimitSetup(app: FastifyInstance) {
  await app.register(rateLimitPlugin, {
    global: true,
    max: 100,
    timeWindow: "1 minute",
    keyGenerator: (req) => req.ip,
  });
}
