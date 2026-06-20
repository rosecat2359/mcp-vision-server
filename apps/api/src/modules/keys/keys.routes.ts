import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middleware/auth.js";
import { rbac } from "../../middleware/rbac.js";
import { auditLog } from "../../middleware/audit.js";
import * as service from "./keys.service.js";
import type { CreateKeyInput } from "@mcp-hub/shared";

export async function keysRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authMiddleware);

  // GET /api/keys
  app.get("/api/keys", async (request) => {
    const query = request.query as { page?: string; pageSize?: string };
    return service.listKeys(
      request.tenantId,
      query.page ? Number(query.page) : undefined,
      query.pageSize ? Number(query.pageSize) : undefined
    );
  });

  // POST /api/keys
  app.post(
    "/api/keys",
    { onRequest: [rbac("Operator")], onResponse: [auditLog("key.create")] },
    async (request, reply) => {
      const { provider, label, plainKey } = request.body as CreateKeyInput;
      if (!provider || !plainKey) {
        return reply.status(422).send({
          error: { code: "VALIDATION_ERROR", message: "provider, plainKey 为必填" },
        });
      }
      const key = await service.createKey(request.tenantId, { provider, label: label ?? provider, plainKey });
      return reply.status(201).send(key);
    }
  );

  // POST /api/keys/:id/reveal — 一次性查看明文
  app.post(
    "/api/keys/:id/reveal",
    { onRequest: [rbac("Admin")], onResponse: [auditLog("key.reveal")] },
    async (request) => {
      const { id } = request.params as { id: string };
      return service.revealKey(request.tenantId, id);
    }
  );

  // POST /api/keys/:id/test
  app.post(
    "/api/keys/:id/test",
    { onRequest: [rbac("Operator")] },
    async (request) => {
      const { id } = request.params as { id: string };
      return service.testKey(request.tenantId, id);
    }
  );

  // DELETE /api/keys/:id
  app.delete(
    "/api/keys/:id",
    { onRequest: [rbac("Admin")], onResponse: [auditLog("key.delete")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await service.deleteKey(request.tenantId, id);
      return reply.status(204).send();
    }
  );
}
