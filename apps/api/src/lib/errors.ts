export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details ?? null,
      },
    };
  }
}

export const ErrorCodes = {
  TENANT_NOT_FOUND:      { status: 404, code: "TENANT_NOT_FOUND",      message: "租户不存在" },
  SERVER_NOT_FOUND:      { status: 404, code: "SERVER_NOT_FOUND",      message: "MCP Server 不存在" },
  KEY_NOT_FOUND:         { status: 404, code: "KEY_NOT_FOUND",         message: "API Key 不存在" },
  INVALID_CREDENTIALS:   { status: 401, code: "INVALID_CREDENTIALS",   message: "邮箱或密码错误" },
  TOKEN_EXPIRED:         { status: 401, code: "TOKEN_EXPIRED",         message: "Token 已过期，请刷新" },
  TOKEN_INVALID:         { status: 401, code: "TOKEN_INVALID",         message: "Token 无效" },
  INSUFFICIENT_ROLE:     { status: 403, code: "INSUFFICIENT_ROLE",     message: "权限不足" },
  RATE_LIMITED:          { status: 429, code: "RATE_LIMITED",          message: "请求太频繁，请稍后再试" },
  ENCRYPTION_FAILED:     { status: 500, code: "ENCRYPTION_FAILED",     message: "加密操作失败" },
  MCP_CONNECTION_FAILED: { status: 502, code: "MCP_CONNECTION_FAILED", message: "MCP Server 连接失败" },
  VALIDATION_ERROR:      { status: 422, code: "VALIDATION_ERROR",      message: "请求参数错误" },
  DUPLICATE_EMAIL:       { status: 409, code: "DUPLICATE_EMAIL",       message: "邮箱已被注册" },
  DUPLICATE_SERVER_NAME: { status: 409, code: "DUPLICATE_SERVER_NAME", message: "Server 名称已存在" },
} as const;
