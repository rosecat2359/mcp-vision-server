import { prisma } from "../../lib/prisma.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { encrypt, decrypt, maskKey } from "../../lib/crypto.js";
import { getEnv } from "../../env.js";
import type { ApiKeyDTO, ApiKeyRevealDTO, CreateKeyInput, PaginatedResponse } from "@mcp-hub/shared";

function toApiKeyDTO(key: {
  id: string;
  tenantId: string;
  provider: string;
  label: string;
  keyPreview: string;
  isValid: boolean | null;
  lastTested: Date | null;
  createdAt: Date;
}): ApiKeyDTO {
  return {
    id: key.id,
    tenantId: key.tenantId,
    provider: key.provider,
    label: key.label,
    keyPreview: key.keyPreview,
    isValid: key.isValid,
    lastTested: key.lastTested?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
  };
}

export async function listKeys(
  tenantId: string,
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<ApiKeyDTO>> {
  const [items, total] = await Promise.all([
    prisma.apiKey.findMany({
      where: { tenantId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.apiKey.count({ where: { tenantId } }),
  ]);

  return { items: items.map(toApiKeyDTO), total, page, pageSize };
}

export async function createKey(tenantId: string, input: CreateKeyInput): Promise<ApiKeyDTO> {
  const env = getEnv();
  const payload = encrypt(input.plainKey, env.ENCRYPTION_MASTER_KEY);
  const encryptedKey = JSON.stringify(payload);
  const keyPreview = maskKey(input.plainKey);

  const key = await prisma.apiKey.create({
    data: {
      tenantId,
      provider: input.provider,
      label: input.label,
      encryptedKey,
      keyPreview,
    },
  });

  return toApiKeyDTO(key);
}

export async function revealKey(tenantId: string, id: string): Promise<ApiKeyRevealDTO> {
  const key = await prisma.apiKey.findFirst({ where: { id, tenantId } });
  if (!key) {
    throw new AppError(404, "KEY_NOT_FOUND", "API Key 不存在");
  }

  const env = getEnv();
  const payload = JSON.parse(key.encryptedKey);
  const plainKey = decrypt(payload, env.ENCRYPTION_MASTER_KEY);

  return { id: key.id, plainKey };
}

export async function testKey(tenantId: string, id: string): Promise<{ isValid: boolean }> {
  const key = await prisma.apiKey.findFirst({ where: { id, tenantId } });
  if (!key) {
    throw new AppError(404, "KEY_NOT_FOUND", "API Key 不存在");
  }

  const env = getEnv();
  let plainKey: string;
  try {
    const payload = JSON.parse(key.encryptedKey);
    plainKey = decrypt(payload, env.ENCRYPTION_MASTER_KEY);
  } catch {
    await prisma.apiKey.update({ where: { id }, data: { isValid: false, lastTested: new Date() } });
    return { isValid: false };
  }

  // 尝试用此 Key 调一次 Anthropic / OpenAI 的 /models 端点
  try {
    if (key.provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": plainKey, "anthropic-version": "2023-06-01" },
        signal: AbortSignal.timeout(10000),
      });
      const isValid = res.ok;
      await prisma.apiKey.update({ where: { id }, data: { isValid, lastTested: new Date() } });
      return { isValid };
    } else if (key.provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${plainKey}` },
        signal: AbortSignal.timeout(10000),
      });
      const isValid = res.ok;
      await prisma.apiKey.update({ where: { id }, data: { isValid, lastTested: new Date() } });
      return { isValid };
    } else {
      // 对于自定义端点，标记为 null（不可自动验证）
      return { isValid: true };
    }
  } catch {
    await prisma.apiKey.update({ where: { id }, data: { isValid: false, lastTested: new Date() } });
    return { isValid: false };
  }
}

export async function deleteKey(tenantId: string, id: string): Promise<void> {
  const key = await prisma.apiKey.findFirst({ where: { id, tenantId } });
  if (!key) {
    throw new AppError(404, "KEY_NOT_FOUND", "API Key 不存在");
  }
  await prisma.apiKey.delete({ where: { id } });
}
