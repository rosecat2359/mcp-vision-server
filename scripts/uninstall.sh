#!/usr/bin/env bash
# ============================================================================
# MCP Hub 卸载脚本
# 用途：停止服务 + 移除进程/反代（可选删除代码和数据库数据）
#
# 用法：
#   sudo bash scripts/uninstall.sh              # 保留代码和数据（默认）
#   sudo bash scripts/uninstall.sh --purge       # 彻底删除代码 + 数据库数据
#
# ⚠️ --purge 不可逆！会删除 /opt/mcp-hub 和 PostgreSQL 数据卷
# ============================================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/mcp-hub}"
PURGE=false
[[ "${1:-}" == "--purge" ]] && PURGE=true

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }

if [[ $EUID -ne 0 ]]; then
  err "请用 root 或 sudo 执行：sudo bash $0"
  exit 1
fi

echo "================================================"
if $PURGE; then
  warn "彻底卸载模式（--purge）：将删除代码和数据库数据"
else
  log "标准卸载模式：仅停止服务，保留代码和数据"
fi
echo "================================================"

# 二次确认（--purge）
if $PURGE; then
  read -rp "确认彻底删除 $APP_DIR 和数据库数据？此操作不可逆！输入 yes 继续: " ans
  [[ "$ans" == "yes" ]] || { err "已取消"; exit 1; }
fi

# 1. 停止后端进程
log "停止 pm2 进程"
pm2 delete mcp-hub-api 2>/dev/null || warn "mcp-hub-api 未在 pm2 中"
pm2 save 2>/dev/null || true

# 2. 停止并（可选）删除数据库容器
if [[ -f "$APP_DIR/docker-compose.yml" ]]; then
  cd "$APP_DIR"
  if $PURGE; then
    warn "停止并删除数据库容器和数据卷"
    docker compose down -v
  else
    log "停止数据库容器（保留数据卷）"
    docker compose down
  fi
  cd /
fi

# 3. 停止 Caddy + 移除配置
if systemctl is-active --quiet caddy; then
  log "停止 Caddy"
  systemctl stop caddy
fi
if [[ -f /etc/caddy/Caddyfile ]]; then
  if $PURGE; then
    rm -f /etc/caddy/Caddyfile
    log "已删除 Caddyfile"
  else
    warn "保留 /etc/caddy/Caddyfile（如需彻底卸载用 --purge）"
  fi
fi

# 4. 关闭防火墙规则
warn "如不再需要，手动移除 ufw 规则：ufw delete allow 8443/tcp"

# 5.（可选）删除代码
if $PURGE; then
  if [[ -d "$APP_DIR" ]]; then
    warn "删除代码目录 $APP_DIR"
    rm -rf "$APP_DIR"
  fi
  # 删除 pm2 开机自启
  pm2 unstartup 2>/dev/null || true
  log "彻底卸载完成"
else
  log "卸载完成（代码和数据保留于 $APP_DIR）"
  echo
  echo "重新启动："
  echo "  cd $APP_DIR && docker compose up -d && pm2 start apps/api/dist/index.js --name mcp-hub-api && systemctl start caddy"
fi

echo "================================================"
warn "已安装的系统组件（Node/Docker/Caddy/pnpm/pm2）未卸载"
warn "如需一并移除：apt remove -y nodejs docker-ce caddy && npm uninstall -g pnpm pm2"
