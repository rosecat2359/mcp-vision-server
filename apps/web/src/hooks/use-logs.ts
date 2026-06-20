import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import type { ConnectionLogDTO, AuditLogDTO, PaginatedResponse } from "@mcp-hub/shared";

export function useConnectionLogs(filters?: { serverId?: string; page?: number }) {
  return useQuery({
    queryKey: ["logs", "connection", filters],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (filters?.serverId) sp.set("serverId", filters.serverId);
      if (filters?.page) sp.set("page", String(filters.page));
      return api.get(`logs/connection?${sp.toString()}`).json<PaginatedResponse<ConnectionLogDTO>>();
    },
  });
}

export function useAuditLogs(filters?: { page?: number }) {
  return useQuery({
    queryKey: ["logs", "audit", filters],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (filters?.page) sp.set("page", String(filters.page));
      return api.get(`logs/audit?${sp.toString()}`).json<PaginatedResponse<AuditLogDTO>>();
    },
  });
}
