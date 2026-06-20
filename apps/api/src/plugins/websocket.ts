import type { FastifyInstance } from "fastify";
import websocketPlugin from "@fastify/websocket";
import type { WsEvent } from "@mcp-hub/shared";

// 连接池: serverId → Set<WebSocket>
const connections = new Map<string, Set<{ send: (data: string) => void }>>();

export function broadcastEvent(event: WsEvent): void {
  const data = JSON.stringify(event);
  // 所有连接接收
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
    const clientId = `client-${Date.now()}-${Math.random()}`;
    const key = clientId;

    // 添加到全局连接池
    if (!connections.has(key)) {
      connections.set(key, new Set());
    }
    connections.get(key)!.add(socket);

    app.log.info(`WebSocket connected: ${clientId}`);

    socket.on("close", () => {
      connections.get(key)?.delete(socket);
      if (connections.get(key)?.size === 0) {
        connections.delete(key);
      }
      app.log.info(`WebSocket disconnected: ${clientId}`);
    });

    // 发送欢迎消息
    socket.send(JSON.stringify({ type: "connected", clientId }));
  });
}
