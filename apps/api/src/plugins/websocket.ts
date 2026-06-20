import type { FastifyInstance } from "fastify";
import websocketPlugin from "@fastify/websocket";
import type { WsEvent } from "@mcp-hub/shared";
import { verifyAccessToken } from "../lib/jwt.js";

// 连接池: tenantId → Set<WebSocket>
const connections = new Map<string, Set<{ send: (data: string) => void; tenantId: string }>>();

export function broadcastEvent(event: WsEvent): void {
  const data = JSON.stringify(event);
  for (const sockets of connections.values()) {
    for (const ws of sockets) {
      try {
        ws.send(data);
      } catch {
        // 连接已断开，忽略
      }
    }
  }
}

export async function websocketRoutes(app: FastifyInstance) {
  await app.register(websocketPlugin);

  app.get("/ws/status", { websocket: true }, (socket, req) => {
    // JWT 认证 — 从 URL query 参数中提取 token
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const token = url.searchParams.get("token");

    if (!token) {
      // 无 token，拒绝连接
      socket.send(JSON.stringify({ type: "error", message: "缺少认证 token，连接被拒绝" }));
      socket.close();
      return;
    }

    let tenantId: string;
    try {
      const payload = verifyAccessToken(token);
      tenantId = payload.tenantId;
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Token 无效或已过期，连接被拒绝" }));
      socket.close();
      return;
    }

    const clientId = `client-${tenantId}-${Date.now()}-${Math.random()}`;

    // 按 tenantId 分组连接
    if (!connections.has(tenantId)) {
      connections.set(tenantId, new Set());
    }
    connections.get(tenantId)!.add(socket);

    app.log.info(`WebSocket connected: ${clientId} (tenant: ${tenantId})`);

    socket.on("close", () => {
      connections.get(tenantId)?.delete(socket);
      if (connections.get(tenantId)?.size === 0) {
        connections.delete(tenantId);
      }
      app.log.info(`WebSocket disconnected: ${clientId}`);
    });

    // 发送欢迎消息
    socket.send(JSON.stringify({ type: "connected", clientId }));
  });
}
