import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { WsEvent } from "@mcp-hub/shared";
import { useAuthStore } from "../lib/auth.js";

export function useWebSocket() {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const getToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!getToken) return; // 未登录时不连接

    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${location.host}/ws/status?token=${encodeURIComponent(getToken)}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsEvent;
        if (data.type === "error") {
          console.warn("WebSocket error:", data.message);
          return;
        }
        if (data.type === "connected") return; // 欢迎消息忽略
        if (data.type === "server_status" || data.type === "connection_log") {
          qc.invalidateQueries({ queryKey: ["servers"] });
        }
        if (data.type === "key_test_result") {
          qc.invalidateQueries({ queryKey: ["keys"] });
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      // 5 秒后重连
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) {
          // 重新连接由 useEffect 依赖变化触发
        }
      }, 5000);
    };

    return () => {
      ws.close();
    };
  }, [qc, getToken]);
}
