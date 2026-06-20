import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { decrypt } from "../../lib/crypto.js";
import { getEnv } from "../../env.js";
import { generateClaudeConfig, configToYaml } from "@mcp-hub/shared/mcp-config";
import type { ConnectTestInput, ConnectTestOutput, GenerateConfigInput, GenerateConfigOutput } from "@mcp-hub/shared";

export async function testConnection(
  tenantId: string,
  input: ConnectTestInput
): Promise<ConnectTestOutput> {
  const start = Date.now();
  try {
    let response: Response;
    if (input.transport === "sse") {
      response = await fetch(input.endpoint, {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          ...(input.authType === "bearer" && input.authValue
            ? { Authorization: `Bearer ${input.authValue}` }
            : {}),
        },
        signal: AbortSignal.timeout(10000),
      });
    } else {
      // stdio: 无法通过 HTTP 测试
      return { success: false, latencyMs: 0, error: "stdio 传输模式无法通过 HTTP 进行连接测试，请直接在服务器上验证" };
    }

    const latencyMs = Date.now() - start;
    return {
      success: response.ok,
      latencyMs,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (e) {
    return {
      success: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export async function generateConfig(
  tenantId: string,
  input: GenerateConfigInput
): Promise<GenerateConfigOutput> {
  const server = await prisma.mcpServer.findFirst({
    where: { id: input.serverId, tenantId },
  });
  if (!server) {
    throw new AppError(404, "SERVER_NOT_FOUND", "MCP Server 不存在");
  }

  let apiKey: string | undefined;
  if (input.keyId) {
    const key = await prisma.apiKey.findFirst({
      where: { id: input.keyId, tenantId },
    });
    if (!key) {
      throw new AppError(404, "KEY_NOT_FOUND", "API Key 不存在");
    }
    const env = getEnv();
    const payload = JSON.parse(key.encryptedKey);
    apiKey = decrypt(payload, env.ENCRYPTION_MASTER_KEY);
  }

  const jsonConfig = generateClaudeConfig(
    {
      id: server.id,
      tenantId: server.tenantId,
      name: server.name,
      transport: server.transport as "sse" | "stdio",
      endpoint: server.endpoint,
      authType: server.authType as "bearer" | "mtls" | "none",
      status: server.status as "online" | "offline" | "error",
      lastPing: server.lastPing?.toISOString() ?? null,
      tags: server.tags,
      createdAt: server.createdAt.toISOString(),
    },
    apiKey
  );

  return {
    json: jsonConfig as unknown as Record<string, unknown>,
    yaml: configToYaml(jsonConfig),
  };
}
