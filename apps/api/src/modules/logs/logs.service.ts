import { prisma } from "../../lib/prisma.js";
import type { ConnectionLogDTO, AuditLogDTO, PaginatedResponse } from "@mcp-hub/shared";

export async function listConnectionLogs(
  tenantId: string,
  filters: { serverId?: string; event?: string; page?: number; pageSize?: number }
): Promise<PaginatedResponse<ConnectionLogDTO>> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const where: Record<string, unknown> = {};

  if (filters.serverId) {
    // verify server belongs to tenant
    const server = await prisma.mcpServer.findFirst({
      where: { id: filters.serverId, tenantId },
    });
    if (!server) {
      return { items: [], total: 0, page, pageSize };
    }
    where.serverId = filters.serverId;
  } else {
    // filter by tenant's servers
    const tenantServers = await prisma.mcpServer.findMany({
      where: { tenantId },
      select: { id: true },
    });
    where.serverId = { in: tenantServers.map((s: { id: string }) => s.id) };
  }
  if (filters.event) where.event = filters.event;

  const [items, total] = await Promise.all([
    prisma.connectionLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { timestamp: "desc" },
    }),
    prisma.connectionLog.count({ where }),
  ]);

  return {
    items: items.map((log: Record<string, unknown>) => ({
      id: log.id,
      serverId: log.serverId,
      event: log.event,
      message: log.message,
      timestamp: (log.timestamp as Date).toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}

export async function listAuditLogs(
  tenantId: string,
  filters: { action?: string; userId?: string; page?: number; pageSize?: number }
): Promise<PaginatedResponse<AuditLogDTO>> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const where: Record<string, unknown> = { tenantId };
  if (filters.action) where.action = filters.action;
  if (filters.userId) where.userId = filters.userId;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { timestamp: "desc" },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: items.map((log: Record<string, unknown>) => ({
      id: log.id,
      tenantId: log.tenantId,
      userId: log.userId,
      action: log.action,
      resource: log.resource,
      ip: log.ip,
      timestamp: (log.timestamp as Date).toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}
