import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middleware/auth.js";
import { rbac } from "../../middleware/rbac.js";
import * as service from "./logs.service.js";

export async function logsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authMiddleware);

  // GET /api/logs/connection
  app.get("/api/logs/connection", async (request) => {
    const query = request.query as { serverId?: string; event?: string; page?: string; pageSize?: string };
    return service.listConnectionLogs(request.tenantId, {
      serverId: query.serverId,
      event: query.event,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
  });

  // GET /api/logs/audit
  app.get(
    "/api/logs/audit",
    { onRequest: [rbac("Admin")] },
    async (request) => {
      const query = request.query as { action?: string; userId?: string; page?: string; pageSize?: string };
      return service.listAuditLogs(request.tenantId, {
        action: query.action,
        userId: query.userId,
        page: query.page ? Number(query.page) : undefined,
        pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      });
    }
  );
}
