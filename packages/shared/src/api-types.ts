// ===== 枚举 =====
export type UserRole = "Admin" | "Operator" | "Viewer";
export type TransportType = "sse" | "stdio";
export type AuthType = "bearer" | "mtls" | "none";
export type ServerStatus = "online" | "offline" | "error";

// ===== DTO =====
export interface TenantDTO {
  id: string;
  name: string;
  createdAt: string;
}

export interface UserDTO {
  id: string;
  email: string;
  role: UserRole;
  totpEnabled: boolean;
  createdAt: string;
}

export interface McpServerDTO {
  id: string;
  tenantId: string;
  name: string;
  transport: TransportType;
  endpoint: string;
  authType: AuthType;
  status: ServerStatus;
  lastPing: string | null;
  tags: string[];
  createdAt: string;
}

export interface McpServerDetailDTO extends McpServerDTO {
  recentLogs: ConnectionLogDTO[];
}

export interface ApiKeyDTO {
  id: string;
  tenantId: string;
  provider: string;
  label: string;
  keyPreview: string;
  isValid: boolean | null;
  lastTested: string | null;
  createdAt: string;
}

export interface ApiKeyRevealDTO {
  id: string;
  plainKey: string;
}

export interface ConnectionLogDTO {
  id: string;
  serverId: string;
  event: string;
  message: string | null;
  timestamp: string;
}

export interface AuditLogDTO {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  resource: string | null;
  ip: string | null;
  timestamp: string;
}

// ===== 请求体 =====
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  tenantName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserDTO;
  tenant: TenantDTO;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface CreateServerInput {
  name: string;
  transport: TransportType;
  endpoint: string;
  authType: AuthType;
  apiKey?: string;
  tags?: string[];
}

export interface UpdateServerInput {
  name?: string;
  endpoint?: string;
  tags?: string[];
}

export interface CreateKeyInput {
  provider: string;
  label: string;
  plainKey: string;
}

export interface GenerateConfigInput {
  serverId: string;
  keyId?: string;
}

export interface GenerateConfigOutput {
  json: Record<string, unknown>;
  yaml: string;
}

export interface ConnectTestInput {
  endpoint: string;
  transport: TransportType;
  authType: AuthType;
  authValue?: string;
}

export interface ConnectTestOutput {
  success: boolean;
  latencyMs: number;
  error?: string;
}

export interface WsEventServerStatus {
  type: "server_status";
  serverId: string;
  status: ServerStatus;
  timestamp: string;
}

export interface WsEventConnectionLog {
  type: "connection_log";
  serverId: string;
  event: string;
  message?: string;
}

export interface WsEventKeyTestResult {
  type: "key_test_result";
  keyId: string;
  isValid: boolean;
}

/** WebSocket 错误消息（认证失败等） */
export interface WsEventError {
  type: "error";
  message: string;
}

/** WebSocket 连接成功 */
export interface WsEventConnected {
  type: "connected";
  clientId: string;
}

export type WsEvent = WsEventServerStatus | WsEventConnectionLog | WsEventKeyTestResult | WsEventError | WsEventConnected;

// ===== 错误响应 =====
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ===== 分页 =====
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
