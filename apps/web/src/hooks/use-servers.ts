import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import type { McpServerDTO, McpServerDetailDTO, CreateServerInput, PaginatedResponse } from "@mcp-hub/shared";

export function useServers(filters?: { status?: string }) {
  return useQuery({
    queryKey: ["servers", filters],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (filters?.status) searchParams.set("status", filters.status);
      return api.get(`servers?${searchParams.toString()}`).json<PaginatedResponse<McpServerDTO>>();
    },
  });
}

export function useServer(id: string) {
  return useQuery({
    queryKey: ["servers", id],
    queryFn: () => api.get(`servers/${id}`).json<McpServerDetailDTO>(),
    enabled: !!id,
  });
}

export function useCreateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateServerInput) =>
      api.post("servers", { json: input }).json<McpServerDTO>(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}

export function useDeleteServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`servers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}

export function usePingServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`servers/${id}/ping`).json<{ status: string; latencyMs: number }>(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}
