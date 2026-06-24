# MCP Hub 运维手册

本文档面向服务器运维人员，涵盖日常运维、日志查看、备份恢复、排障和升级流程。

## 部署位置约定

| 项 | 路径 / 值 |
|----|----------|
| 代码目录 | `/opt/mcp-hub` |
| 后端进程 | pm2 托管，进程名 `mcp-hub-api` |
| 前端静态 | `/opt/mcp-hub/apps/web/dist` |
| API 端口 | `3001`（仅本机访问，由 Caddy 反代） |
| 对外端口 | `8443`（HTTPS） |
| 环境变量 | `/opt/mcp-hub/apps/api/.env` |
| Caddy 配置 | `/etc/caddy/Caddyfile` |
| PostgreSQL | Docker 容器 `mcp-hub-postgres-1`，端口 5432 |
| Redis | Docker 容器 `mcp-hub-redis-1`，端口 6379 |

## 一、日常运维命令

### 服务状态

```bash
pm2 status                      # 查看后端进程状态
pm2 logs mcp-hub-api --lines 50 # 查看后端最近日志
pm2 monit                       # 实时监控（CPU/内存/日志）
systemctl status caddy          # Caddy 反代状态
docker ps                       # 数据库容器状态
```

### 服务控制

```bash
pm2 restart mcp-hub-api         # 重启后端
pm2 reload mcp-hub-api          # 零停机重载（仅 cluster 模式）
pm2 stop mcp-hub-api            # 停止后端
systemctl restart caddy         # 重启反代（改 Caddyfile 后）
docker compose restart          # 重启数据库（在 /opt/mcp-hub 下）
docker compose down             # 停止数据库（保留数据）
docker compose up -d            # 启动数据库
```

### 查看日志

```bash
# 后端日志（实时）
pm2 logs mcp-hub-api

# 后端日志（最近 200 行，不跟随）
pm2 logs mcp-hub-api --lines 200 --nostream

# Caddy / HTTPS 证书日志
journalctl -u caddy -f
journalctl -u caddy --since "1 hour ago" --no-pager

# 数据库日志
docker compose logs -f postgres
docker compose logs -f redis
```

## 二、升级流程

代码更新后，使用仓库自带的更新脚本（已处理依赖、Prisma 迁移、构建、重启）：

```bash
cd /opt/mcp-hub
git pull
sudo bash scripts/update.sh
```

`update.sh` 会自动完成：拉取代码 → `pnpm install` → `prisma generate + db push` → `pnpm build` → 重启 pm2 + 重载 Caddy。

### 手动升级（脚本失败时）

```bash
cd /opt/mcp-hub
git pull

# 1. 依赖
pnpm install --no-frozen-lockfile

# 2. Prisma（需先导入 .env）
set -a
source apps/api/.env
set +a
cd packages/data && pnpm db:generate && pnpm db:push && cd ../..

# 3. 构建（清理增量缓存）
rm -f packages/shared/tsconfig.tsbuildinfo packages/data/tsconfig.tsbuildinfo
pnpm build

# 4. 重启
pm2 restart mcp-hub-api
systemctl reload caddy
```

## 三、备份与恢复

### 备份环境变量（最重要）

`ENCRYPTION_MASTER_KEY` 丢失则所有已存凭据无法解密，**务必备份**：

```bash
cp /opt/mcp-hub/apps/api/.env /backup/mcp-hub.env.$(date +%Y%m%d)
# 同时记录到密码管理器
```

### 备份数据库

```bash
# 逻辑备份（推荐，跨版本兼容）
docker exec mcp-hub-postgres-1 pg_dump -U mcp_hub mcp_hub > /backup/mcp-hub-$(date +%Y%m%d).sql

# 恢复
cat /backup/mcp-hub-20260624.sql | docker exec -i mcp-hub-postgres-1 psql -U mcp_hub mcp_hub
```

### 定时备份（crontab）

```bash
# 每日凌晨 3 点备份数据库
crontab -e
# 加入：
0 3 * * * docker exec mcp-hub-postgres-1 pg_dump -U mcp_hub mcp_hub > /backup/mcp-hub-$(date +\%Y\%m\%d).sql && find /backup -name "mcp-hub-*.sql" -mtime +14 -delete
```

### 阿里云快照

部署后立即在控制台为系统盘创建快照，并配置自动快照策略（每日）。这是整机回滚的最终保障。

## 四、排障

### 访问不了（502 / 连接超时）

```bash
# 1. 后端是否在跑
pm2 status                      # status 应为 online
curl -i http://127.0.0.1:3001/api/health  # 应返回 200 JSON

# 2. 后端崩了看日志
pm2 logs mcp-hub-api --lines 30 --nostream

# 3. Caddy 是否正常
systemctl status caddy
caddy validate --config /etc/caddy/Caddyfile

# 4. 安全组是否放行 8443
curl -s -o /dev/null -w "%{http_code}" https://127.0.0.1:8443/ -k
```

### HTTPS 证书问题

```bash
# 看证书申请日志
journalctl -u caddy --no-pager -n 50 | grep -iE "obtain|certificate|error"

# 常见原因：
#   - 安全组未放行 80/443（ACME 验证需要）
#   - 域名解析未指向本机：dig +short 你的域名
#   - 证书申请进入退避：清状态重试
systemctl stop caddy
rm -rf /var/lib/caddy/.local/share/caddy/{certificates,acme}
systemctl start caddy
```

### 后端启动即崩（pm2 显示 online 但端口不通）

通常因环境变量未加载或运行时模块解析失败：

```bash
# 查看错误日志
pm2 logs mcp-hub-api --lines 30 --nostream

# 常见报错：
#   ERR_UNKNOWN_FILE_EXTENSION → shared/data 包未正确指向 dist，
#       检查 packages/shared/package.json 和 packages/data/package.json 的 main 指向 dist/*.js
#   DATABASE_URL is not set → .env 未加载，pm2 启动时需 source
#   PrismaClient 初始化失败 → 跑 prisma generate
```

### 数据库连不上

```bash
docker ps                                   # 容器是否 Up
docker compose logs --tail 30 postgres      # PG 日志
docker compose restart postgres             # 重启 PG
# 确认 .env 的 DATABASE_URL 与 docker-compose.yml 一致
```

### 构建失败（OOM）

2G 内存机器构建可能 OOM：

```bash
# 已有 2G swap，若仍失败，本地构建后上传 dist
# 或临时加大 swap
swapoff /swapfile
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
```

## 五、卸载

```bash
# 保留代码和数据
sudo bash scripts/uninstall.sh

# 彻底删除（代码 + 数据库数据，不可逆）
sudo bash scripts/uninstall.sh --purge
```

系统组件（Node/Docker/Caddy/pnpm/pm2）不会被卸载，如需一并清理：

```bash
apt remove -y nodejs docker-ce caddy
npm uninstall -g pnpm pm2
```

## 六、常用路径速查

```bash
# 代码
cd /opt/mcp-hub

# 后端环境变量
cat /opt/mcp-hub/apps/api/.env

# Caddy 配置
cat /etc/caddy/Caddyfile

# pm2 进程配置
pm2 describe mcp-hub-api

# Docker 数据卷
docker volume ls | grep pgdata
```
