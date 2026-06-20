import { create } from "zustand";
import type { LoginResponse, UserDTO, TenantDTO } from "@mcp-hub/shared";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserDTO | null;
  tenant: TenantDTO | null;
  isLoggedIn: boolean;

  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (response: LoginResponse) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  tenant: null,
  isLoggedIn: false,

  setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
  setUser: (response) =>
    set({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
      tenant: response.tenant,
      isLoggedIn: true,
    }),
  logout: () =>
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      tenant: null,
      isLoggedIn: false,
    }),
}));
