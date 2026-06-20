import jwt from "jsonwebtoken";
import { getEnv } from "../env.js";
import { AppError, ErrorCodes } from "./errors.js";

export interface JwtPayload {
  userId: string;
  tenantId: string;
}

export function generateAccessToken(userId: string, tenantId: string): string {
  const env = getEnv();
  return jwt.sign({ userId, tenantId }, env.JWT_SECRET, {
    expiresIn: "15m",
    issuer: "mcp-hub",
  });
}

export function generateRefreshToken(userId: string, tenantId: string): string {
  const env = getEnv();
  return jwt.sign({ userId, tenantId, type: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
    issuer: "mcp-hub",
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const env = getEnv();
    const payload = jwt.verify(token, env.JWT_SECRET, { issuer: "mcp-hub" }) as jwt.JwtPayload;
    return { userId: payload.userId!, tenantId: payload.tenantId! };
  } catch (e) {
    if (e instanceof jwt.TokenExpiredError) {
      throw new AppError(401, "TOKEN_EXPIRED", "Token 已过期，请刷新");
    }
    throw new AppError(401, "TOKEN_INVALID", "Token 无效");
  }
}

export function verifyRefreshToken(token: string): JwtPayload {
  try {
    const env = getEnv();
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: "mcp-hub" }) as jwt.JwtPayload;
    if (payload.type !== "refresh") {
      throw new AppError(401, "TOKEN_INVALID", "无效的 Refresh Token");
    }
    return { userId: payload.userId!, tenantId: payload.tenantId! };
  } catch (e) {
    if (e instanceof AppError) throw e;
    if (e instanceof jwt.TokenExpiredError) {
      throw new AppError(401, "TOKEN_EXPIRED", "Refresh Token 已过期，请重新登录");
    }
    throw new AppError(401, "TOKEN_INVALID", "Refresh Token 无效");
  }
}
