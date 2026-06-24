import { useAuthStore } from "../../lib/auth.js";
import { useLogout } from "../../hooks/use-auth.js";
import { Icon } from "../ui/icon.js";

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const logout = useLogout();

  return (
    <header className="h-14 bg-surface border-b border-border-default flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-sm font-medium text-ink-strong truncate">
          {tenant?.name ?? "我的工作区"}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-ink-muted truncate max-w-[200px]">
          {user?.email}
        </span>
        <button
          onClick={() => logout.mutate()}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-ink-muted hover:text-danger hover:bg-danger-soft rounded-md transition-colors"
          aria-label="退出登录"
        >
          <Icon name="logout" className="w-4 h-4" />
          退出
        </button>
      </div>
    </header>
  );
}
