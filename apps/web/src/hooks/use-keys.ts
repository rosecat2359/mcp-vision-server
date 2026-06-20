import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import type { ApiKeyDTO, ApiKeyRevealDTO, CreateKeyInput, PaginatedResponse } from "@mcp-hub/shared";

export function useKeys() {
  return useQuery({
    queryKey: ["keys"],
    queryFn: () => api.get("keys").json<PaginatedResponse<ApiKeyDTO>>(),
  });
}

export function useCreateKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateKeyInput) =>
      api.post("keys", { json: input }).json<ApiKeyDTO>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["keys"] }),
  });
}

export function useRevealKey() {
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`keys/${id}/reveal`).json<ApiKeyRevealDTO>(),
  });
}

export function useTestKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`keys/${id}/test`).json<{ isValid: boolean }>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["keys"] }),
  });
}

export function useDeleteKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`keys/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["keys"] }),
  });
}
