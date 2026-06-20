import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { WsEvent } from "@mcp-hub/shared";

export function useWebSocket() {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${location.host}/ws/status`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsEvent;
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
      // Reconnect after 5s
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) {
          // re-connection handled by re-render
        }
      }, 5000);
    };

    return () => {
      ws.close();
    };
  }, [qc]);
}
