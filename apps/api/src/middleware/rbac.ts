import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";

type Role = "Admin" | "Operator" | "Viewer";

const ROLE_HIERARCHY: Record<Role, number> = { Admin: 3, Operator: 2, Viewer: 1 };

export function rbac(minimumRole: Role) {
  return async function rbacMiddleware(request: FastifyRequest, _reply: FastifyReply) {
    // 需要先经过 authMiddleware
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { role: true },
    });

    if (!user) {
      throw new AppError(401, "TOKEN_INVALID", "用户不存在");
    }

    request.userRole = user.role;
    const userLevel = ROLE_HIERARCHY[user.role as Role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole];

    if (userLevel < requiredLevel) {
      throw new AppError(403, "INSUFFICIENT_ROLE", `需要 ${minimumRole} 权限`);
    }
  };
}
