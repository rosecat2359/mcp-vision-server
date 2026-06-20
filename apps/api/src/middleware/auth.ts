import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken } from "../lib/jwt.js";
import { AppError } from "../lib/errors.js";

export async function authMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(401, "TOKEN_INVALID", "缺少 Authorization header");
  }

  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token);

  request.userId = payload.userId;
  request.tenantId = payload.tenantId;
}
