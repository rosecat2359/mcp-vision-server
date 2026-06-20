import { prisma } from "../../lib/prisma.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { encrypt, decrypt } from "../../lib/crypto.js";
import { getEnv } from "../../env.js";
import type {
  McpServerDTO,
  McpServerDetailDTO,
  CreateServerInput,
  UpdateServerInput,
  ConnectionLogDTO,
  PaginatedResponse,
} from "@mcp-hub/shared";

function toMcpServerDTO(server: {
  id: string;
  tenantId: string;
  name: string;
  transport: string;
  endpoint: string;
  authType: string;
  status: string;
  lastPing: Date | null;
  tags: string[];
  createdAt: Date;
}): McpServerDTO {
  return {
    id: server.id,
    tenantId: server.tenantId,
    name: server.name,
    transport: server.transport as McpServerDTO["transport"],
    endpoint: server.endpoint,
    authType: server.authType as McpServerDTO["authType"],
    status: server.status as McpServerDTO["status"],
    lastPing: server.lastPing?.toISOString() ?? null,
    tags: server.tags,
    createdAt: server.createdAt.toISOString(),
  };
}

export async function listServers(
  tenantId: string,
  filters: { status?: string; transport?: string; page?: number; pageSize?: number }
): Promise<PaginatedResponse<McpServerDTO>> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const where: Record<string, unknown> = { tenantId };
  if (filters.status) where.status = filters.status;
  if (filters.transport) where.transport = filters.transport;

  const [items, total] = await Promise.all([
    prisma.mcpServer.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.mcpServer.count({ where }),
  ]);

  return {
    items: items.map(toMcpServerDTO),
    total,
    page,
    pageSize,
  };
}

export async function createServer(
  tenantId: string,
  input: CreateServerInput
): Promise<McpServerDTO> {
  const existing = await prisma.mcpServer.findUnique({
    where: { tenantId_name: { tenantId, name: input.name } },
  });
  if (existing) {
    throw new AppError(409, "DUPLICATE_SERVER_NAME", `Server "${input.name}" 已存在`);
  }

  const env = getEnv();
  let encryptedKey: string | null = null;
  if (input.apiKey) {
    const payload = encrypt(input.apiKey, env.ENCRYPTION_MASTER_KEY);
    encryptedKey = JSON.stringify(payload);
  }

  const server = await prisma.mcpServer.create({
    data: {
      tenantId,
      name: input.name,
      transport: input.transport,
      endpoint: input.endpoint,
      authType: input.authType,
      encryptedKey,
      tags: input.tags ?? [],
    },
  });

  return toMcpServerDTO(server);
}

export async function getServer(tenantId: string, id: string): Promise<McpServerDetailDTO> {
  const server = await prisma.mcpServer.findFirst({
    where: { id, tenantId },
    include: {
      logs: { take: 50, orderBy: { timestamp: "desc" } },
    },
  });

  if (!server) {
    throw new AppError(404, "SERVER_NOT_FOUND", "MCP Server 不存在");
  }

  const recentLogs: ConnectionLogDTO[] = server.logs.map((log) => ({
    id: log.id,
    serverId: log.serverId,
    event: log.event,
    message: log.message,
    timestamp: log.timestamp.toISOString(),
  }));

  return { ...toMcpServerDTO(server), recentLogs };
}

export async function updateServer(
  tenantId: string,
  id: string,
  input: UpdateServerInput
): Promise<McpServerDTO> {
  const existing = await prisma.mcpServer.findFirst({ where: { id, tenantId } });
  if (!existing) {
    throw new AppError(404, "SERVER_NOT_FOUND", "MCP Server 不存在");
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.endpoint !== undefined) data.endpoint = input.endpoint;
  if (input.tags !== undefined) data.tags = input.tags;

  const server = await prisma.mcpServer.update({ where: { id }, data });
  return toMcpServerDTO(server);
}

export async function deleteServer(tenantId: string, id: string): Promise<void> {
  const existing = await prisma.mcpServer.findFirst({ where: { id, tenantId } });
  if (!existing) {
    throw new AppError(404, "SERVER_NOT_FOUND", "MCP Server 不存在");
  }
  await prisma.mcpServer.delete({ where: { id } });
}

export async function pingServer(
  serverId: string
): Promise<{ status: "online" | "offline" | "error"; latencyMs: number }> {
  const server = await prisma.mcpServer.findUnique({ where: { id: serverId } });
  if (!server) {
    throw new AppError(404, "SERVER_NOT_FOUND", "MCP Server 不存在");
  }

  const start = Date.now();
  try {
    if (server.transport === "sse") {
      const response = await fetch(server.endpoint, {
        method: "GET",
        headers: { Accept: "text/event-stream" },
        signal: AbortSignal.timeout(5000),
      });
      const latencyMs = Date.now() - start;
      const isOk = response.ok || response.status === 0;
      return { status: isOk ? "online" : "error", latencyMs };
    } else {
      // stdio: 无法通过 HTTP ping
      return { status: "online", latencyMs: 0 };
    }
  } catch {
    const latencyMs = Date.now() - start;
    await prisma.connectionLog.create({
      data: {
        serverId,
        event: "disconnected",
        message: "Ping failed",
      },
    });
    return { status: "offline", latencyMs };
  }
}

export async function updateServerStatus(
  serverId: string,
  status: "online" | "offline" | "error"
): Promise<void> {
  await prisma.mcpServer.update({
    where: { id: serverId },
    data: { status, lastPing: new Date() },
  });
}

export async function getServerLogs(
  tenantId: string,
  serverId: string,
  page = 1,
  pageSize = 50
): Promise<PaginatedResponse<ConnectionLogDTO>> {
  const server = await prisma.mcpServer.findFirst({ where: { id: serverId, tenantId } });
  if (!server) {
    throw new AppError(404, "SERVER_NOT_FOUND", "MCP Server 不存在");
  }

  const [items, total] = await Promise.all([
    prisma.connectionLog.findMany({
      where: { serverId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { timestamp: "desc" },
    }),
    prisma.connectionLog.count({ where: { serverId } }),
  ]);

  return {
    items: items.map((log) => ({
      id: log.id,
      serverId: log.serverId,
      event: log.event,
      message: log.message,
      timestamp: log.timestamp.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}
