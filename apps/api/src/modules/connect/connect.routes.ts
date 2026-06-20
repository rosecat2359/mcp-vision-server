import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middleware/auth.js";
import { rbac } from "../../middleware/rbac.js";
import { auditLog } from "../../middleware/audit.js";
import * as service from "./connect.service.js";
import type { ConnectTestInput, GenerateConfigInput } from "@mcp-hub/shared";

export async function connectRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authMiddleware);

  // POST /api/connect/test
  app.post("/api/connect/test", async (request) => {
    const body = request.body as ConnectTestInput;
    return service.testConnection(request.tenantId, body);
  });

  // POST /api/connect/generate
  app.post(
    "/api/connect/generate",
    { onRequest: [rbac("Operator")], onResponse: [auditLog("config.generate")] },
    async (request) => {
      const body = request.body as GenerateConfigInput;
      return service.generateConfig(request.tenantId, body);
    }
  );
}
