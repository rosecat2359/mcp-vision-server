# MCP Vision Server

为 DeepSeek V4 Pro 等无原生视觉能力的模型提供视觉服务的 MCP Server。

> **v0.2.0** — 现已支持多 Provider（OpenAI、OpenRouter、Groq、自定义端点等），自动按任务类型路由到最优模型。

## 功能

| 工具 | 功能 |
|------|------|
| `analyze_image` | 图片理解/描述/分类 |
| `extract_text` | OCR 文字提取 |
| `generate_image` | 文生图 |
| `edit_image` | 图片编辑/修复 |
| `analyze_video` | 视频理解/摘要 |
| `generate_video` | 文生视频 |
| `list_providers` | 列出所有已配置的 AI Provider 及模型 |

## 安装

```bash
pip install -e ".[dev]"
```

## 配置

### 级别 1：单 Provider（Agnes AI — 与 v0.1 完全兼容）

```json
{
  "mcpServers": {
    "vision": {
      "command": "python",
      "args": ["-m", "mcp_vision_server"],
      "env": {
        "AGNES_API_KEY": "sk-xxx"
      }
    }
  }
}
```

### 级别 2：一键切换到 OpenAI

```json
{
  "mcpServers": {
    "vision": {
      "command": "python",
      "args": ["-m", "mcp_vision_server"],
      "env": {
        "VISION_PROVIDER": "openai",
        "OPENAI_API_KEY": "sk-xxx"
      }
    }
  }
}
```

### 级别 3：按任务分配不同 Provider

```json
{
  "mcpServers": {
    "vision": {
      "command": "python",
      "args": ["-m", "mcp_vision_server"],
      "env": {
        "VISION_PROVIDER": "openai",
        "IMAGE_PROVIDER": "agnes",
        "VIDEO_PROVIDER": "agnes",
        "OPENAI_API_KEY": "sk-openai-xxx",
        "AGNES_API_KEY": "sk-agnes-xxx",
        "VISION_MODEL": "gpt-4o",
        "IMAGE_GEN_MODEL": "dall-e-3"
      }
    }
  }
}
```

### 自定义端点（自部署模型）

```json
{
  "mcpServers": {
    "vision": {
      "env": {
        "VISION_PROVIDER": "custom",
        "CUSTOM_BASE_URL": "http://localhost:8080/v1",
        "CUSTOM_API_KEY": "sk-local-xxx"
      }
    }
  }
}
```

## 支持的 Provider

| Provider | 环境变量 | 默认端点 | 能力 |
|----------|---------|----------|------|
| **Agnes AI** | `AGNES_API_KEY` | `apihub.agnes-ai.com/v1` | Vision, Image Gen, Image Edit, Video |
| **OpenAI** | `OPENAI_API_KEY` | `api.openai.com/v1` | Vision, Image Gen, Image Edit |
| **OpenRouter** | `OPENROUTER_API_KEY` | `openrouter.ai/api/v1` | Vision, Image Edit |
| **Groq** | `GROQ_API_KEY` | `api.groq.com/openai/v1` | Vision |
| **自定义** | `CUSTOM_API_KEY` + `CUSTOM_BASE_URL` | 自定 | 全部 |

## 环境变量完整参考

### Provider 选择

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VISION_PROVIDER` | 默认 Provider 名称 | 自动检测 |
| `IMAGE_PROVIDER` | 图片任务专用 Provider | 跟随 VISION_PROVIDER |
| `VIDEO_PROVIDER` | 视频任务专用 Provider | 跟随 VISION_PROVIDER |
| `PROVIDER_FALLBACK` | 备选 Provider 列表（逗号分隔） | — |

### 模型覆盖

| 变量 | 适用工具 | 说明 |
|------|----------|------|
| `VISION_MODEL` | analyze_image, extract_text | 视觉理解模型 |
| `IMAGE_GEN_MODEL` | generate_image | 文生图模型 |
| `IMAGE_EDIT_MODEL` | edit_image | 图片编辑模型 |
| `VIDEO_ANALYSIS_MODEL` | analyze_video | 视频分析模型 |
| `VIDEO_GEN_MODEL` | generate_video | 视频生成模型 |

### Agnes AI（向后兼容）

| 变量 | 必填 | 默认值 |
|------|------|--------|
| `AGNES_API_KEY` | 否* | — |
| `AGNES_BASE_URL` | 否 | `https://apihub.agnes-ai.com/v1` |
| `AGNES_DEFAULT_MODEL` | 否 | `agnes-2.0-flash` |
| `AGNES_TIMEOUT` | 否 | `120` |
| `AGNES_MAX_RETRIES` | 否 | `3` |

> *如果只使用 Agnes 而不设置其他 Provider，则 AGNES_API_KEY 为必填。

### 其他 Provider 密钥

| 变量 | 说明 |
|------|------|
| `OPENAI_API_KEY` | OpenAI API Key |
| `OPENROUTER_API_KEY` | OpenRouter API Key |
| `GROQ_API_KEY` | Groq API Key |
| `CUSTOM_API_KEY` | 自定义端点 API Key |
| `CUSTOM_BASE_URL` | 自定义端点地址 |

## 路由规则

工具调用时，Provider 选择优先级为：

1. **工具参数指定** — 如果 tool call 里传了 `provider` 参数
2. **环境变量按任务指定** — 如 `IMAGE_PROVIDER=agnes`
3. **全局默认** — `VISION_PROVIDER` 的值
4. **自动检测** — 第一个具有所需能力的已注册 Provider

## 使用示例

配置完成后，在 Claude Code 中直接使用：

- "帮我看看这张图片里有什么" → 自动调用 `analyze_image`
- "提取这张截图里的文字" → 自动调用 `extract_text`
- "生成一张猫的图片" → 自动调用 `generate_image`
- "分析这个视频的内容" → 自动调用 `analyze_video`
- "当前有哪些可用的 AI 服务？" → 自动调用 `list_providers`

## 测试

```bash
python -m pytest tests/ -v
```

## 技术栈

- Python 3.11+
- MCP SDK (stdio)
- httpx (HTTP)
- Pillow (图片处理)

## MCP Hub 部署指南（自托管）

本仓库同时包含 **MCP Hub**（一个管理多个 MCP Server 的 Web 平台），采用 pnpm + turbo monorepo：

```
apps/
├── api/            # Fastify 5 后端（JWT + WebSocket + Bullmq 队列）
└── web/            # React 18 + Vite 7 + Tailwind 4 前端
packages/
├── data/           # Prisma 数据层（PostgreSQL）
└── shared/         # 跨端共享类型
docker-compose.yml  # PostgreSQL 17 + Redis 7
```

### 一键部署（推荐）

提供三个脚本（位于 `scripts/`）：

| 脚本 | 用途 |
|------|------|
| `scripts/deploy.sh` | 全新部署：装环境 → 起数据库 → 构建 → 启动 → Caddy 反代 |
| `scripts/update.sh` | 更新代码：拉取 → 依赖 → 构建 → 重启（保留 .env 和数据） |
| `scripts/uninstall.sh` | 卸载：停止服务。`--purge` 彻底删除代码和数据 |

#### 适用环境

脚本针对**自托管云服务器**设计（已在阿里云上海验证）：

- Ubuntu 22.04 / 24.04 / 26.04
- 最低 2 核 2G / 20G SSD（建议 4G）
- 需开放端口：22（SSH）、8443（HTTPS）

#### 部署步骤

```bash
# 1. 克隆仓库
git clone -b feature/mcp-hub https://github.com/rosecat2359/mcp-vision-server.git /opt/mcp-hub
cd /opt/mcp-hub

# 2. 执行部署（替换 你的域名）
sudo DOMAIN=你的域名 bash scripts/deploy.sh
```

> 部署脚本会自动完成：swap、ufw、Node 20、Docker、Caddy、pnpm、pm2、Prisma、构建、反向代理、HTTPS 证书签发。

#### 未备案服务器（大陆节点）

ICP 备案要求年满 18 周岁。若无法备案，脚本默认使用 **8443 端口**绕过 80/443 拦截：

- 访问地址：`https://你的域名:8443`
- 需在云厂商**安全组**放行 8443/TCP（脚本无法代替）
- 域名 A 记录需指向服务器公网 IP

### 环境变量

部署脚本自动生成（写入 `apps/api/.env`，首次生成后不覆盖）：

| 变量 | 说明 |
|------|-----|
| `DATABASE_URL` | PostgreSQL 连接串（默认 `postgresql://mcp_hub:mcp_hub_dev@localhost:5432/mcp_hub`） |
| `REDIS_URL` | Redis 连接串（默认 `redis://localhost:6379`） |
| `ENCRYPTION_MASTER_KEY` | 64 位 hex，加密存储的 MCP server 凭据。**丢失则已存凭据无法解密** |
| `JWT_SECRET` | JWT 签名密钥（≥32 字符，自动生成 64 hex） |
| `JWT_REFRESH_SECRET` | Refresh Token 签名密钥（≥32 字符，自动生成 64 hex） |
| `CORS_ORIGIN` | 前端地址，默认 `https://域名:8443` |
| `PORT` | API 监听端口，默认 `3001` |
| `HOST` | 监听地址，默认 `0.0.0.0` |

> ⚠️ **务必备份 `ENCRYPTION_MASTER_KEY`**，服务器重装或迁移时需用同一密钥才能解密数据库中的凭据。

### 更新与卸载

```bash
# 更新到最新代码
sudo bash scripts/update.sh

# 标准卸载（保留代码和数据）
sudo bash scripts/uninstall.sh

# 彻底卸载（删除代码 + 数据库数据，不可逆）
sudo bash scripts/uninstall.sh --purge
```

### 常用运维命令

```bash
pm2 logs mcp-hub-api          # 查看后端日志
pm2 restart mcp-hub-api       # 重启后端
docker ps                     # 查看数据库容器
journalctl -u caddy -f        # 查看 Caddy/HTTPS 日志
docker compose logs -f        # 查看数据库日志
```

### 托管平台部署（可选）

如不自行部署，也可用托管服务：

- **前端**：Vercel，Root Directory 设为 `apps/web`，Framework Preset = Vite
- **后端**：Railway，从 GitHub 导入并配置环境变量
- **数据库**：Neon / Supabase（PostgreSQL 免费档）+ Upstash（Redis 免费档）

> 注意：Vercel Hobby 计划不可商用；Railway 无长期免费计划。

## 开发

### MCP Hub（TypeScript）

```bash
pnpm install
pnpm docker:up        # 启动本地 PostgreSQL + Redis
pnpm db:generate && pnpm db:push
pnpm dev              # 同时启动前端 (5173) 和后端 (3001)
pnpm test             # 运行测试
pnpm build            # 构建所有包
```

### 视觉服务（Python）

```bash
pip install -e ".[dev]"
python -m pytest tests/ -v
```

