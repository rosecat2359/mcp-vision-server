import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";

export function auditLog(action: string, resource?: string) {
  return async function auditHook(request: FastifyRequest, _reply: FastifyReply) {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: request.tenantId,
          userId: request.userId,
          action,
          resource: resource ?? null,
          ip: request.ip,
        },
      });
    } catch {
      // 审计日志写入失败不应阻止主操作
    }
  };
}
