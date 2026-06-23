#!/usr/bin/env bash
# ============================================================================
# MCP Hub 一键部署脚本（阿里云上海 / Ubuntu 26.04 / 2核2G / 3Mbps / 未备案）
# 方案 A：非标准端口 8443 + Caddy 自动 HTTPS
#
# 用法：
#   sudo bash scripts/deploy.sh
#
# 部署前请确认：
#   1. 域名实名认证已完成
#   2. 域名 A 记录已指向本机公网 IP
#   3. 阿里云安全组入方向已放行 8443/TCP 和 22/TCP
#   4. 以 root（或 sudo）执行
# ============================================================================

set -euo pipefail

# ---------- 可配置项（按需修改） ----------
DOMAIN="${DOMAIN:-}"                      # 你的域名，例如 hub.example.com
APP_DIR="${APP_DIR:-/opt/mcp-hub}"        # 部署目录
REPO_URL="${REPO_URL:-}"                  # 仓库地址（可选，留空则假定已在 APP_DIR）
API_PORT="${API_PORT:-3001}"              # API 监听端口（代码默认 3001）
PUBLIC_PORT="${PUBLIC_PORT:-8443}"        # 对外端口（未备案用 8443）
NODE_MAJOR="${NODE_MAJOR:-20}"            # Node LTS 大版本
# ------------------------------------------

# 颜色输出
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }

# 必须 root
if [[ $EUID -ne 0 ]]; then
  err "请用 root 或 sudo 执行：sudo bash $0"
  exit 1
fi

# 域名必填
if [[ -z "$DOMAIN" ]]; then
  err "未设置域名。请执行：sudo DOMAIN=你的域名 bash $0"
  err "或在脚本顶部修改 DOMAIN 变量。"
  exit 1
fi

log "开始部署 MCP Hub"
log "域名:        $DOMAIN"
log "对外端口:    $PUBLIC_PORT"
log "API 端口:    $API_PORT"
log "部署目录:    $APP_DIR"
echo "------------------------------------------------"

# ============================================================================
# 1. 系统：swap（2G 内存防构建 OOM）
# ============================================================================
if [[ ! -f /swapfile ]]; then
  log "创建 2G swap"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
  log "swap 已存在，跳过"
fi

# ============================================================================
# 2. 系统防火墙
# ============================================================================
log "配置 ufw 防火墙"
ufw --force reset >/dev/null
ufw allow 22/tcp
ufw allow ${PUBLIC_PORT}/tcp
ufw --force enable >/dev/null
warn "注意：阿里云安全组也要放行 ${PUBLIC_PORT}/TCP（控制台操作，脚本无法代替）"

# ============================================================================
# 3. Node.js + pnpm + pm2 + git
# ============================================================================
if ! command -v node >/dev/null 2>&1; then
  log "安装 Node.js ${NODE_MAJOR}"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
log "Node 版本: $(node -v)"

npm install -g pnpm pm2 2>/dev/null || warn "pnpm/pm2 安装跳过（可能已装）"

apt-get install -y git curl ca-certificates >/dev/null

# ============================================================================
# 4. Docker（跑 PostgreSQL + Redis）
# ============================================================================
if ! command -v docker >/dev/null 2>&1; then
  log "安装 Docker"
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null
log "Docker 版本: $(docker --version)"

# 配置 Docker 镜像加速器（国内大陆服务器拉 Docker Hub 会超时）
# 可通过 DOCKER_REGISTRY_MIRROR 环境变量指定专属加速器，否则用公共镜像列表
if [[ -n "${DOCKER_REGISTRY_MIRROR:-}" ]]; then
  MIRRORS="\"${DOCKER_REGISTRY_MIRROR}\""
else
  # 公共加速器（2026 仍可用的几个，按顺序尝试）
  MIRRORS='"https://docker.1ms.run","https://docker.xuanyuan.me","https://docker.1panel.live"'
fi
if ! grep -q "registry-mirrors" /etc/docker/daemon.json 2>/dev/null; then
  log "配置 Docker 镜像加速器"
  mkdir -p /etc/docker
  cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [${MIRRORS}],
  "log-opts": {"max-size": "10m", "max-file": "3"}
}
EOF
  systemctl restart docker
  sleep 2
  warn "若仍拉镜像超时，请在阿里云控制台获取专属加速器地址后重跑："
  warn "  sudo DOCKER_REGISTRY_MIRROR=https://xxx.mirror.aliyuncs.com bash scripts/deploy.sh"
else
  log "Docker 镜像加速器已配置，跳过"
fi

# ============================================================================
# 5. Caddy（自动 HTTPS）
# ============================================================================
if ! command -v caddy >/dev/null 2>&1; then
  log "安装 Caddy"
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https >/dev/null
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -y >/dev/null
  apt-get install -y caddy >/dev/null
fi
log "Caddy 版本: $(caddy version | head -1)"

# ============================================================================
# 6. 拉取代码
# ============================================================================
if [[ ! -d "$APP_DIR/.git" ]]; then
  if [[ -z "$REPO_URL" ]]; then
    err "部署目录 $APP_DIR 不存在且未设置 REPO_URL"
    err "请执行：sudo DOMAIN=xxx REPO_URL=git@... bash $0"
    exit 1
  fi
  log "克隆仓库到 $APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"
log "拉取最新代码"
git pull --ff-only 2>/dev/null || warn "git pull 跳过（可能有本地修改）"

# ============================================================================
# 7. 装依赖
# ============================================================================
log "安装依赖（pnpm）"
# 部署用 --no-frozen-lockfile，避免 lockfile 与 package.json 漂移导致安装失败
pnpm install --no-frozen-lockfile

# ============================================================================
# 8. 启动数据库（PostgreSQL + Redis）
# ============================================================================
log "启动 PostgreSQL + Redis（docker compose）"
docker compose up -d
sleep 5
if ! docker ps --format '{{.Names}}' | grep -q postgres; then
  err "PostgreSQL 容器未启动，检查 docker compose"
  docker compose logs
  exit 1
fi
log "数据库容器: $(docker ps --format '{{.Names}}' | tr '\n' ' ')"

# ============================================================================
# 9. 生成密钥 + 写 .env
# ============================================================================
ENV_FILE="apps/api/.env"
if [[ -f "$ENV_FILE" ]]; then
  warn "$ENV_FILE 已存在，保留旧配置（不覆盖密钥）"
else
  log "生成密钥并写入 $ENV_FILE"
  MASTER_KEY=$(openssl rand -hex 32)
  JWT1=$(openssl rand -hex 32)
  JWT2=$(openssl rand -hex 32)

  cat > "$ENV_FILE" <<EOF
DATABASE_URL=postgresql://mcp_hub:mcp_hub_dev@localhost:5432/mcp_hub
REDIS_URL=redis://localhost:6379
ENCRYPTION_MASTER_KEY=$MASTER_KEY
JWT_SECRET=$JWT1
JWT_REFRESH_SECRET=$JWT2
CORS_ORIGIN=https://${DOMAIN}:${PUBLIC_PORT}
NODE_ENV=production
PORT=${API_PORT}
HOST=0.0.0.0
EOF
  chmod 600 "$ENV_FILE"
  warn "ENCRYPTION_MASTER_KEY 已生成并写入，请另行备份，丢失将无法解密已存凭据"
fi

# 让 docker compose 起的 PG 对本机 5432 可达（compose 默认端口映射）
# 若 compose 未映射 5432 到宿主，需要确认 docker-compose.yml 的 ports

# ============================================================================
# 10. Prisma 生成 + 推表
# ============================================================================
log "Prisma generate + db push"
# Prisma 7 的 prisma.config.ts 用 env("DATABASE_URL") 从进程环境读取，
# 不会自动加载 apps/api/.env，这里手动 source 进环境
set -a
# shellcheck disable=SC1091
source "$APP_DIR/apps/api/.env"
set +a
cd packages/data
pnpm db:generate
pnpm db:push
cd "$APP_DIR"

# ============================================================================
# 11. 构建
# ============================================================================
log "构建前端 + 后端（2G 内存可能较慢，有 swap 兜底）"
# 清理 tsc 增量缓存，避免 dist 被删后 tsc -b 误判为 up-to-date 静默跳过
rm -f packages/shared/tsconfig.tsbuildinfo packages/data/tsconfig.tsbuildinfo
pnpm build

# ============================================================================
# 12. pm2 守护后端
# ============================================================================
log "用 pm2 启动后端"
pm2 delete mcp-hub-api 2>/dev/null || true
pm2 start apps/api/dist/index.js --name mcp-hub-api
pm2 save
# 开机自启（按 pm2 提示执行其输出的命令）
if [[ ! -f /etc/systemd/system/pm2-*.service ]]; then
  env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root 2>/dev/null \
    || warn "pm2 startup 需手动按提示执行"
fi

# ============================================================================
# 13. Caddy 反代 + 自动 HTTPS
# ============================================================================
log "配置 Caddyfile"
cat > /etc/caddy/Caddyfile <<EOF
${DOMAIN}:${PUBLIC_PORT} {
    root * ${APP_DIR}/apps/web/dist
    try_files {path} /index.html
    file_server

    handle /api/* {
        reverse_proxy 127.0.0.1:${API_PORT}
    }

    handle /ws/* {
        reverse_proxy 127.0.0.1:${API_PORT}
    }
}
EOF

systemctl restart caddy
systemctl enable caddy >/dev/null

# ============================================================================
# 14. 验证
# ============================================================================
echo "------------------------------------------------"
log "本地 API 测试"
sleep 2
if curl -sf "http://127.0.0.1:${API_PORT}/" >/dev/null 2>&1; then
  log "API 已响应 (127.0.0.1:${API_PORT})"
else
  warn "API 暂未响应，查看日志：pm2 logs mcp-hub-api"
fi

log "部署完成！"
echo
echo -e "${GREEN}访问地址：${NC} https://${DOMAIN}:${PUBLIC_PORT}"
echo
echo -e "${YELLOW}后续检查：${NC}"
echo "  - 浏览器访问上方地址（首次证书签发约需 30 秒）"
echo "  - Caddy 日志：       journalctl -u caddy -f"
echo "  - API 日志：         pm2 logs mcp-hub-api"
echo "  - 数据库容器：       docker ps"
echo
echo -e "${YELLOW}重要：${NC}ENCRYPTION_MASTER_KEY 在 apps/api/.env，务必备份！"
