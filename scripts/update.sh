#!/usr/bin/env bash
# ============================================================================
# MCP Hub 更新脚本
# 用途：拉取最新代码 → 重新构建 → 重启服务（保留 .env 和数据库数据）
#
# 用法：
#   sudo bash scripts/update.sh
# ============================================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/mcp-hub}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }

if [[ $EUID -ne 0 ]]; then
  err "请用 root 或 sudo 执行：sudo bash $0"
  exit 1
fi

cd "$APP_DIR" || { err "部署目录不存在: $APP_DIR"; exit 1; }

echo "================================================"
log "更新 MCP Hub: $APP_DIR"
echo "================================================"

# 1. 备份当前 .env（保险）
if [[ -f apps/api/.env ]]; then
  cp apps/api/.env "apps/api/.env.bak.$(date +%s)" 2>/dev/null || true
  log "已备份 .env"
fi

# 2. 拉取最新代码
log "拉取最新代码"
git fetch --all
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
log "当前分支: $CURRENT_BRANCH"
git pull --ff-only || {
  warn "git pull 失败（可能有本地修改或需手动合并）"
  warn "如需强制覆盖本地修改，执行：git reset --hard origin/$CURRENT_BRANCH"
  exit 1
}

# 3. 安装依赖（lockfile 变化时更新）
log "安装依赖"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# 4. 数据库迁移（schema 变化时推送）
log "Prisma generate + db push"
# 手动 source .env，供 prisma.config.ts 读取 DATABASE_URL
set -a
# shellcheck disable=SC1091
source "$APP_DIR/apps/api/.env"
set +a
(cd packages/data && pnpm db:generate && pnpm db:push)

# 5. 重新构建
log "重新构建前端 + 后端"
pnpm build

# 6. 重启后端
log "重启后端进程"
pm2 restart mcp-hub-api 2>/dev/null || {
  warn "pm2 中无 mcp-hub-api，重新启动"
  pm2 start apps/api/dist/index.js --name mcp-hub-api
}
pm2 save

# 7. 重载 Caddy（Caddyfile 可能更新）
if systemctl is-active --quiet caddy; then
  log "重载 Caddy 配置"
  systemctl reload caddy || warn "Caddy reload 失败，配置未变可忽略"
fi

echo "------------------------------------------------"
log "更新完成！"
pm2 status
echo
warn "如遇异常回滚：git reset --hard <旧commit> && pnpm build && pm2 restart mcp-hub-api"
