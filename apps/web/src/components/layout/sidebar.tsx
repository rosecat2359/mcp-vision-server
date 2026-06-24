import { NavLink } from "react-router-dom";
import { Icon, type IconName } from "../ui/icon.js";
import { cn } from "../../lib/utils.js";

const links: { to: string; label: string; icon: IconName }[] = [
  { to: "/dashboard/servers", label: "服务器", icon: "server" },
  { to: "/dashboard/keys", label: "API 密钥", icon: "key" },
  { to: "/dashboard/connect", label: "连接向导", icon: "plug" },
  { to: "/dashboard/logs", label: "日志", icon: "logs" },
  { to: "/dashboard/settings", label: "设置", icon: "settings" },
];

export function Sidebar() {
  return (
    <aside className="w-56 bg-surface border-r border-border-default flex flex-col shrink-0">
      {/* Logo 区 */}
      <div className="h-14 flex items-center gap-2 px-5 border-b border-border-default">
        <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
          <Icon name="terminal" className="w-4 h-4 text-accent-on" strokeWidth={2} />
        </div>
        <span className="font-semibold text-ink-strong tracking-tight">MCP Hub</span>
      </div>

      {/* 导航 */}
      <nav className="flex-1 p-3 space-y-0.5">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-accent-soft text-accent font-medium"
                  : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
              )
            }
          >
            <Icon name={link.icon} className="w-4 h-4" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* 底部版本信息 */}
      <div className="p-4 border-t border-border-default">
        <p className="text-xs text-ink-faint">MCP Hub v0.1</p>
      </div>
    </aside>
  );
}
