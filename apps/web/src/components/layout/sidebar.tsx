import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard/servers", label: "Servers", icon: "🖥" },
  { to: "/dashboard/keys", label: "API Keys", icon: "🔑" },
  { to: "/dashboard/connect", label: "连接向导", icon: "🔗" },
  { to: "/dashboard/logs", label: "日志", icon: "📋" },
  { to: "/dashboard/settings", label: "设置", icon: "⚙" },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-white/72 backdrop-blur-xl border-r border-border-default p-4 flex flex-col">
      <div className="text-xl font-bold text-primary-600 mb-8 px-3">MCP Hub</div>
      <nav className="space-y-1 flex-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                isActive
                  ? "bg-primary-50 text-primary-600 font-medium"
                  : "text-gray-600 hover:bg-white/50"
              }`
            }
          >
            <span>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
