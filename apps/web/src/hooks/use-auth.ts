import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuthStore } from "../lib/auth.js";
import type { LoginInput, RegisterInput, LoginResponse } from "@mcp-hub/shared";

export function useLogin() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (input: LoginInput) =>
      api.post("auth/login", { json: input }).json<LoginResponse>(),
    onSuccess: (data) => {
      setUser(data);
      navigate("/dashboard/servers");
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (input: RegisterInput) =>
      api.post("auth/register", { json: input }).json<LoginResponse>(),
    onSuccess: (data) => {
      setUser(data);
      navigate("/dashboard/servers");
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: () => api.post("auth/logout"),
    onSuccess: () => {
      logout();
      navigate("/");
    },
  });
}
