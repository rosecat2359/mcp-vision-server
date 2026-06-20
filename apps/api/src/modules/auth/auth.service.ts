import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../lib/jwt.js";
import type { RegisterInput, LoginInput, LoginResponse, RefreshResponse } from "@mcp-hub/shared";

const SALT_ROUNDS = 12;

export async function register(input: RegisterInput): Promise<LoginResponse> {
  // 检查邮箱重复
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, "DUPLICATE_EMAIL", "邮箱已被注册");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  // 创建租户 + 用户（事务）
  const result = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
    const tenant = await tx.tenant.create({ data: { name: input.tenantName } });

    // 创建默认租户配置
    await tx.tenantSettings.create({ data: { tenantId: tenant.id } });

    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: input.email,
        passwordHash,
        role: "Admin", // 注册者自动成为 Admin
      },
    });

    return { tenant, user };
  });

  const accessToken = generateAccessToken(result.user.id, result.tenant.id);
  const refreshToken = generateRefreshToken(result.user.id, result.tenant.id);

  return {
    accessToken,
    refreshToken,
    user: {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role as "Admin",
      totpEnabled: false,
      createdAt: result.user.createdAt.toISOString(),
    },
    tenant: {
      id: result.tenant.id,
      name: result.tenant.name,
      createdAt: result.tenant.createdAt.toISOString(),
    },
  };
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { tenant: true },
  });

  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", "邮箱或密码错误");
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "邮箱或密码错误");
  }

  const accessToken = generateAccessToken(user.id, user.tenantId);
  const refreshToken = generateRefreshToken(user.id, user.tenantId);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role as "Admin" | "Operator" | "Viewer",
      totpEnabled: !!user.totpSecret,
      createdAt: user.createdAt.toISOString(),
    },
    tenant: {
      id: user.tenant.id,
      name: user.tenant.name,
      createdAt: user.tenant.createdAt.toISOString(),
    },
  };
}

export async function refresh(token: string): Promise<RefreshResponse> {
  const payload = verifyRefreshToken(token);
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    throw new AppError(401, "TOKEN_INVALID", "用户不存在或已被删除");
  }

  const accessToken = generateAccessToken(user.id, user.tenantId);
  const newRefreshToken = generateRefreshToken(user.id, user.tenantId);

  return { accessToken, refreshToken: newRefreshToken };
}
