# MCP Hub — 远程服务器部署管理平台 · 设计文档

> **状态**: 已审批 | **日期**: 2026-06-21 | **版本**: 1.0
>
> 本文件为 `mcp-hub`（MCP 远程服务器部署管理平台）的技术设计文档，讨论过程记录于 brainstorming session。

---

## 1. 项目概述

| 项 | 详情 |
|----|------|
| 项目名称 | `mcp-hub` |
| 仓库 | `mcp-vision-server`（扩展现有仓库为 monorepo） |
| 定位 | SaaS 多租户 MCP Server 部署与远程连接管理平台 |
| 用户 | 多租户（个人开发者 + 团队 + 组织） |
| 部署 | 云平台部署（Vercel 前端 + Railway 后端） |

### 这个项目做什么？

一个 **生产级 MCP 服务器部署与远程连接管理平台**。用户通过 Web 控制台完成：
- MCP Server 的注册与连接配置（stdio / SSE）
- 多 Provider API Key 的加密管理与有效性检测
- MCP Server 实时状态监控（心跳、延迟、在线状态）
- 连接配置的自动生成（Claude Desktop / Cline 兼容 JSON）
- 操作审计日志

### 与现有仓库的关系

```
mcp-vision-server/                    # 仓库根（扩充为 monorepo）
├── apps/
│   ├── web/                          # React 前端 (新)
│   ├── api/                          # Fastify 后端 (新)
│   └── mcp-vision-server/            # 现有 Python MCP Server (保留，作为被管理示例)
├── packages/
│   ├── shared/                       # 共享 DTO 类型 + API 契约 (新)
│   └── data/                         # Prisma Client 单例 (新)
└── docker-compose.yml                # 本地开发环境 (新)
```

现有 Python 代码保持不变，新平台通过 MCP 协议本身与之解耦——可以将 vision-server 注册为被管理对象。

---

## 2. 技术栈

| 层 | 选择 | 理由 |
|----|------|------|
| Monorepo 构建 | **Turborepo** | 增量构建，`apps/` 并行，`packages/` 依赖编排 |
| 前端框架 | **React 18 + TypeScript** | 生态成熟，类型安全 |
| 构建工具 | **Vite** | HMR 快，ESBuild 打包 |
| 样式 | **Tailwind CSS v4** + CSS Variables | 设计 Token 系统 |
| 动画 | **Framer Motion** | Apple HIG 风格过渡动画 |
| API 框架 | **Fastify 5** | 性能最好，插件系统成熟，TypeScript 原生支持 |
| ORM | **Prisma 7** | 多租户 relation/filter、migration 系统、类型安全 |
| 数据库 | **PostgreSQL 17** | 成熟的关系型数据库 |
| 缓存/队列 | **Redis 7** | 会话、BullMQ 队列、Pub-Sub |
| 实时推送 | **WebSocket** (@fastify/websocket) | Fastify 原生集成 |
| 队列 | **BullMQ** | MCP 健康检查 Worker、Key 有效性检测 |
| 加密 | **node:crypto (AES-256-GCM)** | 零依赖，密钥走环境变量 |
| 包管理 | **pnpm** | Monorepo workspace 原生支持 |

---

## 3. 系统架构

```
                    ┌──────────────────────────────────────────┐
                    │              Cloudflare DNS               │
                    │         api.mcp-hub.com                   │
                    └──────────────┬───────────────────────────┘
                                   │
             ┌─────────────────────┴──────────────────────┐
             │                    │                       │
   ┌─────────▼────────┐  ┌───────▼─────────┐  ┌─────────▼────────┐
   │   Vercel (前端)   │  │ Railway (后端)   │  │ Railway (Worker) │
   │   React SPA       │  │ Fastify API      │  │ BullMQ Worker    │
   │   静态资源 CDN     │  │ HTTPS 443        │  │ 健康检查 + Key测试│
   └──────────────────┘  └────────┬─────────┘  └──────────────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │                            │
          ┌─────────▼────────┐         ┌─────────▼────────┐
          │ Railway Postgres  │        │ Railway Redis     │
          │ (主数据库)         │        │ (缓存/队列/PubSub) │
          └──────────────────┘         └──────────────────┘
```

**数据流（以注册 MCP Server 为例）：**

```
用户在 Web 填写表单
  → React 调用 POST /api/servers (JWT in header)
  → Fastify 中间件: auth → tenant → 校验
  → servers.service 写 PostgreSQL + 入队 BullMQ ping job
  → 返回 McpServer JSON
  → React Query 更新缓存 → re-render 列表 (stagger 动画)
  → Worker 执行 ping → 更新 status → WebSocket 推送给前端
```

---

## 4. 数据库模型（多租户）

### 4.1 租户与用户

```prisma
model Tenant {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())

  users     User[]
  servers   McpServer[]
  apiKeys   ApiKey[]
  settings  TenantSettings?
}

model User {
  id           String    @id @default(uuid())
  tenantId     String
  email        String    @unique
  passwordHash String
  role         UserRole  @default(Viewer)
  totpSecret   String?               // 可选 TOTP
  createdAt    DateTime  @default(now())

  tenant       Tenant    @relation(fields: [tenantId], references: [id])
  auditLogs    AuditLog[]

  @@index([tenantId])
}

enum UserRole { Admin Operator Viewer }
```

### 4.2 MCP Server 注册

```prisma
model McpServer {
  id           String        @id @default(uuid())
  tenantId     String
  name         String
  transport    TransportType
  endpoint     String        // SSE URL 或 ssh://host
  authType     AuthType      // bearer / mtls / none
  encryptedKey String?       // AES-256-GCM 加密，关联的 API Key
  status       ServerStatus  @default(Offline)
  lastPing     DateTime?
  tags         String[]      @default([])
  createdAt    DateTime      @default(now())

  tenant       Tenant        @relation(fields: [tenantId], references: [id])
  logs         ConnectionLog[]

  @@unique([tenantId, name])
  @@index([tenantId])
}

enum TransportType { sse stdio }
enum AuthType      { bearer mtls none }
enum ServerStatus  { online offline error }
```

### 4.3 API Key 托管

```prisma
model ApiKey {
  id           String   @id @default(uuid())
  tenantId     String
  provider     String   // anthropic / openai / openrouter / groq / custom
  label        String
  encryptedKey String   // AES-256-GCM 密文
  keyPreview   String   // "sk-ant-****...****f8a2"
  isValid      Boolean?
  lastTested   DateTime?
  createdAt    DateTime @default(now())

  tenant       Tenant   @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
}
```

### 4.4 日志

```prisma
model ConnectionLog {
  id        String   @id @default(uuid())
  serverId  String
  event     String   // connected / disconnected / error / tool_call
  message   String?
  timestamp DateTime @default(now())

  server    McpServer @relation(fields: [serverId], references: [id], onDelete: Cascade)

  @@index([serverId, timestamp])
}

model AuditLog {
  id        String   @id @default(uuid())
  tenantId  String
  userId    String
  action    String   // "server.create", "key.delete", "user.invite"
  resource  String?  // 操作对象 ID
  ip        String?
  timestamp DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])

  @@index([tenantId, timestamp])
}
```

### 4.5 租户配置

```prisma
model TenantSettings {
  tenantId          String   @id
  rateLimitPerMin   Int      @default(100)
  sessionTimeoutMin Int      @default(1440)
  allowedProviders  String[] @default(["anthropic","openai","openrouter","groq","custom"])

  tenant            Tenant   @relation(fields: [tenantId], references: [id])
}
```

### 关键设计决策

- **多租户隔离**：所有主要表都有 `tenantId`，通过 Fastify 中间件注入租户上下文，Prisma 查询自动带 `where: { tenantId }`
- **Key 加密**：`ApiKey.encryptedKey` 和 `McpServer.encryptedKey` 都存 AES-256-GCM 密文，明文仅在内存中短暂存在
- **Key 预览**：`keyPreview` 预计算存储，避免每次解密
- **日志分级**：`ConnectionLog`（高频，MCP Server 连接）和 `AuditLog`（低频，用户操作）分开存储
- **无软删除**：SaaS 阶段直接 `CASCADE DELETE`，避免 `archivedAt` 使查询变复杂

---

## 5. 后端 API 设计

### 5.1 模块结构

```
apps/api/src/
├── index.ts                    # Fastify 启动入口
├── app.ts                      # 插件注册 + 中间件
├── env.ts                      # Zod 校验环境变量
│
├── middleware/
│   ├── auth.ts                 # JWT 验证 → request.user
│   ├── tenant.ts               # 租户上下文 → request.tenantId
│   └── rbac.ts                 # Role 权限检查
│
├── modules/
│   ├── auth/                   # 认证模块
│   ├── servers/                # MCP Server CRUD + 健康检查
│   ├── keys/                   # API Key 加密管理
│   ├── logs/                   # 连接日志 + 审计日志
│   └── connect/                # 连接向导 + 配置生成
│
├── plugins/
│   ├── cors.ts                 # CORS 白名单
│   ├── rate-limit.ts           # @fastify/rate-limit
│   ├── websocket.ts            # @fastify/websocket
│   └── swagger.ts              # OpenAPI 文档
│
└── lib/
    ├── crypto.ts               # AES-256-GCM encrypt/decrypt
    ├── jwt.ts                   # Access + Refresh Token 工具
    ├── prisma.ts               # PrismaClient 单例
    └── errors.ts               # 统一错误类 + 错误码
```

### 5.2 端点清单

#### 认证（无 JWT）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 创建租户 + 管理员 |
| POST | `/api/auth/login` | 返回 access + refresh token |
| POST | `/api/auth/refresh` | Refresh token 轮换 |
| POST | `/api/auth/logout` | 撤销 refresh token |

#### MCP Server（需 JWT）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/servers` | 列表（status/transport/tags 筛选） |
| POST | `/api/servers` | 注册新 Server |
| GET | `/api/servers/:id` | 详情 + 最近日志 |
| PATCH | `/api/servers/:id` | 编辑名称/tags/endpoint |
| DELETE | `/api/servers/:id` | 删除（级联日志） |
| POST | `/api/servers/:id/ping` | 手动触发健康检查 |
| GET | `/api/servers/:id/logs` | 该 Server 连接日志 |

#### API Key（需 JWT）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/keys` | 列表（脱敏 key + 有效性） |
| POST | `/api/keys` | 添加 Key（明文 → 加密存储） |
| POST | `/api/keys/:id/reveal` | 一次性查看明文（需二次验证） |
| POST | `/api/keys/:id/test` | 测试 Key 有效性 |
| POST | `/api/keys/:id/rotate` | 轮换 Key |
| DELETE | `/api/keys/:id` | 删除 |

#### 连接向导

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/connect/test` | 测试 MCP 连接可达性 |
| POST | `/api/connect/generate` | 生成 Claude Desktop 配置 JSON |

#### 日志与审计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/logs/connection` | 连接日志（serverId + time 筛选） |
| GET | `/api/logs/audit` | 操作审计日志 |

#### WebSocket

| 方法 | 路径 | 说明 |
|------|------|------|
| WS | `/ws/status` | 推送 Server 状态变化事件 |

### 5.3 WebSocket 事件格式

```typescript
type WsEvent =
  | { type: "server_status"; serverId: string; status: "online"|"offline"|"error"; timestamp: string }
  | { type: "connection_log"; serverId: string; event: string; message?: string }
  | { type: "key_test_result"; keyId: string; isValid: boolean }
```

### 5.4 MCP 连接配置输出格式

```json
{
  "mcpServers": {
    "my-server": {
      "transport": {
        "type": "sse",
        "url": "https://mcp.example.com/sse",
        "headers": {
          "Authorization": "Bearer <decrypted-on-client>"
        }
      }
    }
  }
}
```

---

## 6. 前端设计

### 6.1 组件树

```
apps/web/src/
├── App.tsx                       # Router + QueryClientProvider + AnimatePresence
│
├── styles/
│   ├── globals.css               # Tailwind v4 + CSS Variables (Design Tokens)
│   └── tokens.ts                 # 设计 Token 常量导出
│
├── lib/
│   ├── api.ts                    # HTTP 客户端 — 自动 JWT + refresh 拦截
│   ├── auth.ts                   # Zustand auth store (token 只在内存)
│   ├── motion.ts                 # Framer Motion Preset
│   └── utils.ts                  # 格式化 / 脱敏 / 时间
│
├── hooks/
│   ├── use-servers.ts            # React Query: useServers, useServer, usePing
│   ├── use-keys.ts               # React Query: useKeys, useRevealKey
│   ├── use-logs.ts               # React Query: useConnectionLogs, useAuditLogs
│   ├── use-websocket.ts          # WebSocket 连接 + 事件分发
│   └── use-auth.ts               # login/register/logout mutations
│
├── components/
│   ├── ui/                       # 基础 UI 原语
│   │   ├── glass-card.tsx        # bg-glass + backdrop-blur + border-primary/12%
│   │   ├── status-indicator.tsx  # ● online 脉冲动画
│   │   ├── badge.tsx             # 标签 (Provider / Transport / Status)
│   │   ├── reveal-input.tsx      # 一次性查看输入框
│   │   ├── empty-state.tsx       # 空状态插画
│   │   └── code-block.tsx        # JSON/YAML 配置展示 + 复制按钮
│   │
│   ├── layout/
│   │   ├── app-shell.tsx         # 侧边栏 + 顶栏 + 内容区
│   │   ├── sidebar.tsx           # 导航
│   │   └── topbar.tsx            # 租户名 + 用户菜单
│   │
│   ├── servers/
│   │   ├── server-card.tsx       # Glass Card + 状态指示灯
│   │   ├── server-list.tsx       # 卡片网格 (stagger 浮现动画)
│   │   ├── server-form.tsx       # 新增/编辑表单
│   │   └── server-detail.tsx     # 详情面板 + 实时日志流
│   │
│   ├── keys/
│   │   ├── key-row.tsx           # 脱敏 Key 行 + 操作按钮
│   │   ├── key-form.tsx          # 新增 Key 表单
│   │   └── key-reveal-modal.tsx  # 二次验证 → 一次性解密查看
│   │
│   ├── connect/
│   │   ├── connect-wizard.tsx    # 4 步骤向导
│   │   ├── step-server.tsx       # 步骤 1: 选 Server
│   │   ├── step-provider.tsx     # 步骤 2: 选 Provider + Key
│   │   ├── step-test.tsx         # 步骤 3: 测试连接
│   │   └── step-output.tsx       # 步骤 4: 生成配置
│   │
│   └── logs/
│       ├── log-table.tsx         # 筛选 + 分页表格
│       └── log-timeline.tsx      # 时间轴视图 (可选)
│
├── pages/
│   ├── landing.tsx               # /         产品介绍 + CTA
│   ├── login.tsx                 # /auth/login
│   ├── register.tsx              # /auth/register
│   ├── dashboard.tsx             # /dashboard  总览统计
│   ├── servers.tsx               # /dashboard/servers
│   ├── server-new.tsx            # /dashboard/servers/new
│   ├── server-detail.tsx         # /dashboard/servers/:id
│   ├── keys.tsx                  # /dashboard/keys
│   ├── connect.tsx               # /dashboard/connect
│   ├── logs.tsx                  # /dashboard/logs
│   └── settings.tsx              # /dashboard/settings
│
└── router.tsx                    # createBrowserRouter 配置
```

### 6.2 状态管理分层

| 层 | 工具 | 职责 |
|----|------|------|
| Server State | React Query | REST 数据缓存、自动重取、optimistic update |
| Client State | Zustand | Auth tokens（仅内存！）、UI 状态 |
| Realtime | use-websocket | WebSocket 事件 → React Query cache |

### 6.3 设计 Token 系统

```css
:root {
  /* 主色 Primary */
  --color-primary-50:  #EEF2FF;
  --color-primary-400: #6366F1;
  --color-primary-600: #4338CA;
  --color-primary-900: #1E1B4B;

  /* 辅色 Secondary */
  --color-secondary-50:  #F0FDFA;
  --color-secondary-400: #2DD4BF;
  --color-secondary-600: #0D9488;

  /* 区分色 Accent */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-danger:  #EF4444;
  --color-info:    #3B82F6;

  /* 边框 */
  --color-border-default: rgba(99, 102, 241, 0.12);
  --color-border-strong:  rgba(99, 102, 241, 0.28);
  --color-border-focus:   rgba(99, 102, 241, 0.60);

  /* 背景层次 */
  --bg-page:    linear-gradient(135deg, #F8F7FF 0%, #F0F4FF 50%, #F4F0FF 100%);
  --bg-surface: rgba(255, 255, 255, 0.72);
  --bg-card:    rgba(255, 255, 255, 0.88);
  --bg-glass:   rgba(255, 255, 255, 0.60);
  backdrop-filter: blur(20px) saturate(180%);
}
```

### 6.4 动画规范

```typescript
export const motionPresets = {
  pageTransition: {
    initial: { opacity: 0, y: 16, scale: 0.98 },
    animate: { opacity: 1, y: 0,  scale: 1 },
    exit:    { opacity: 0, y: -8, scale: 0.99 },
    transition: { type: 'spring', stiffness: 380, damping: 30 }
  },
  cardReveal: {
    hidden:  { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.06, type: 'spring', stiffness: 300, damping: 24 }
    })
  },
  modalSpring: {
    initial: { opacity: 0, scale: 0.92, y: 20 },
    animate: { opacity: 1, scale: 1,    y: 0 },
    exit:    { opacity: 0, scale: 0.95, y: 10 },
    transition: { type: 'spring', stiffness: 420, damping: 32 }
  },
  hoverLift: { scale: 1.02, y: -2, transition: { type: 'spring', stiffness: 600 } },
  statusPulse: {
    animate: { scale: [1, 1.4, 1], opacity: [1, 0.4, 1] },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
  }
}
```

---

## 7. 安全设计

### 7.1 加密方案

- **算法**：AES-256-GCM（`node:crypto` 内置）
- **密钥源**：环境变量 `ENCRYPTION_MASTER_KEY`（64 hex → 32 bytes）
- **IV**：每次加密随机生成，包含在密文 payload 中
- **Auth Tag**：GCM 模式自带，校验完整性
- **存储格式**：`{ ciphertext: base64, iv: base64, tag: base64 }`

### 7.2 Key 查看流程

1. 用户点击 [Reveal] → Modal 弹出
2. 二次验证（JWT 确认或输入密码）
3. `POST /api/keys/:id/reveal` → 服务端解密 → 返回明文
4. 前端 Modal 显示 → 用户关闭 → 明文从 state 清除
5. 响应不缓存（React Query: `cacheTime: 0`）

### 7.3 安全头与防护

| 防护 | 实现 |
|------|------|
| HTTPS | Railway 自动 TLS + Cloudflare 强制 HTTPS |
| CORS | 白名单（仅 Vercel 部署地址） |
| CSP | `default-src 'self'; connect-src 'self' wss://<api-host>` |
| Rate Limit | Auth: 10/min, API: 100/min (@fastify/rate-limit) |
| Helmet | X-Content-Type-Options, X-Frame-Options, HSTS |
| JWT | Access (15min) + Refresh (7d) 双 Token |
| 密码 | bcrypt (12 rounds) |

### 7.4 不可妥协的安全规则

- 前端永不明文存储 Key（LocalStorage 禁止）
- API Key 绝不明文落库
- 所有用户操作进入审计日志
- RBAC 默认最小权限（最低 Viewer）
- SQL 注入防护：Prisma 参数化查询

---

## 8. 错误处理

### 统一错误响应格式

```json
{
  "error": {
    "code": "SERVER_NOT_FOUND",
    "message": "MCP Server 不存在",
    "details": null
  }
}
```

### 错误码表

| 错误码 | HTTP | 消息 |
|--------|------|------|
| `TENANT_NOT_FOUND` | 404 | 租户不存在 |
| `SERVER_NOT_FOUND` | 404 | MCP Server 不存在 |
| `KEY_NOT_FOUND` | 404 | API Key 不存在 |
| `INVALID_CREDENTIALS` | 401 | 邮箱或密码错误 |
| `TOKEN_EXPIRED` | 401 | Token 已过期 |
| `INSUFFICIENT_ROLE` | 403 | 权限不足 |
| `RATE_LIMITED` | 429 | 请求太频繁，请稍后再试 |
| `ENCRYPTION_FAILED` | 500 | 加密操作失败 |
| `MCP_CONNECTION_FAILED` | 502 | MCP Server 连接失败 |
| `VALIDATION_ERROR` | 422 | 请求参数错误 |

---

## 9. 项目构建顺序

1. 搭建 monorepo 骨架（turbo.json + workspace + docker-compose）
2. 数据库 Schema（Prisma migration）
3. 后端骨架 + 认证模块（JWT + 租户中间件）
4. MCP Server CRUD + 健康检查 Worker（BullMQ）
5. API Key 加密存储模块
6. WebSocket 实时推送
7. 前端路由 + 设计 Token 系统
8. 各页面 UI + 动画（Servers → Keys → Connect → Logs → Settings）
9. 前后端联调
10. 部署配置（Vercel + Railway）

---

## 10. 已知决策与待定事项

### 已决策

- 技术栈：Node.js (Fastify + Prisma) — 全栈 TypeScript
- 架构：Turborepo monorepo（apps/web + apps/api + apps/mcp-vision-server）
- 前后端类型共享：packages/shared
- 加密：node:crypto AES-256-GCM，零外部依赖
- 无软删除
- 连接日志与审计日志分表

### 待定（实施阶段决定）

- Prisma 具体版本（锁定 7.x 最新稳定版）
- 前端验证库选择（Zod vs React Hook Form 自带）
- 日志事件类型的具体枚举值
- 健康检查的超时与重试策略
- 多语言（i18n）在 v1 或 v2 处理

---

*本文档版本：v1.0 | 生成时间：2026-06-21 | 基于 brainstorming 对话整理*
