import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middleware/auth.js";
import { rbac } from "../../middleware/rbac.js";
import { auditLog } from "../../middleware/audit.js";
import * as service from "./servers.service.js";
import type { CreateServerInput, UpdateServerInput } from "@mcp-hub/shared";

export async function serversRoutes(app: FastifyInstance) {
  // 所有路由需要认证
  app.addHook("onRequest", authMiddleware);

  // GET /api/servers
  app.get("/api/servers", async (request) => {
    const query = request.query as { status?: string; transport?: string; page?: string; pageSize?: string };
    return service.listServers(request.tenantId, {
      status: query.status,
      transport: query.transport,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
  });

  // POST /api/servers
  app.post(
    "/api/servers",
    { onRequest: [rbac("Operator")] },
    async (request, reply) => {
      const body = request.body as CreateServerInput;
      if (!body.name || !body.endpoint) {
        return reply.status(422).send({
          error: { code: "VALIDATION_ERROR", message: "name, endpoint 为必填" },
        });
      }
      const server = await service.createServer(request.tenantId, body);
      return reply.status(201).send(server);
    }
  );

  // GET /api/servers/:id
  app.get("/api/servers/:id", async (request) => {
    const { id } = request.params as { id: string };
    return service.getServer(request.tenantId, id);
  });

  // PATCH /api/servers/:id
  app.patch(
    "/api/servers/:id",
    { onRequest: [rbac("Operator")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as UpdateServerInput;
      return service.updateServer(request.tenantId, id, body);
    }
  );

  // DELETE /api/servers/:id
  app.delete(
    "/api/servers/:id",
    { onRequest: [rbac("Admin")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await service.deleteServer(request.tenantId, id);
      return reply.status(204).send();
    }
  );

  // POST /api/servers/:id/ping
  app.post(
    "/api/servers/:id/ping",
    { onRequest: [rbac("Operator")] },
    async (request) => {
      const { id } = request.params as { id: string };
      // verify ownership
      await service.getServer(request.tenantId, id);
      const result = await service.pingServer(id);
      await service.updateServerStatus(id, result.status);
      return result;
    }
  );

  // GET /api/servers/:id/logs
  app.get("/api/servers/:id/logs", async (request) => {
    const { id } = request.params as { id: string };
    const query = request.query as { page?: string; pageSize?: string };
    return service.getServerLogs(
      request.tenantId,
      id,
      query.page ? Number(query.page) : undefined,
      query.pageSize ? Number(query.pageSize) : undefined
    );
  });
}
