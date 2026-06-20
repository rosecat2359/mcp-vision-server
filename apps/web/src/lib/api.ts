import ky from "ky";
import { useAuthStore } from "./auth.js";

export const api = ky.create({
  prefixUrl: "/api",
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (request, _options, response) => {
        if (response.status === 401) {
          const body = await response.json<{ error?: { code?: string } }>().catch(() => ({} as { error?: { code?: string } }));
          if (body.error?.code === "TOKEN_EXPIRED") {
            // Try refresh
            const refreshToken = useAuthStore.getState().refreshToken;
            if (refreshToken) {
              const refreshRes = await ky.post("/api/auth/refresh", { json: { refreshToken } });
              const data = await refreshRes.json<{ accessToken: string; refreshToken: string }>();
              useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
              request.headers.set("Authorization", `Bearer ${data.accessToken}`);
              return ky(request);
            }
          }
          // Refresh failed or no refresh token — logout
          useAuthStore.getState().logout();
        }
      },
    ],
  },
});
