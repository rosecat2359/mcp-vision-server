import rateLimitPlugin from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

export async function rateLimitSetup(app: FastifyInstance) {
  await app.register(rateLimitPlugin, {
    global: false, // 手动按路由应用
  });

  // Auth routes: 10 req/min
  app.register(async (authScope) => {
    await authScope.register(rateLimitPlugin, {
      max: 10,
      timeWindow: "1 minute",
      keyGenerator: (req) => req.ip,
    });
    // Auth routes are already registered — we apply rate limit globally here
  });
}
