import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    env: {
      DATABASE_URL: "postgresql://mcp_hub:mcp_hub_dev@localhost:5432/mcp_hub",
      REDIS_URL: "redis://localhost:6379",
      ENCRYPTION_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      JWT_SECRET: "dev-jwt-secret-at-least-32-chars-long!!",
      JWT_REFRESH_SECRET: "dev-refresh-secret-at-least-32-chars!!",
      NODE_ENV: "test",
    },
  },
});
