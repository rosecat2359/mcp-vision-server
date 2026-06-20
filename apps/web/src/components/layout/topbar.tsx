import { useAuthStore } from "../../lib/auth.js";
import { useLogout } from "../../hooks/use-auth.js";

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const logout = useLogout();

  return (
    <header className="h-14 bg-white/60 backdrop-blur-xl border-b border-border-default flex items-center justify-between px-6">
      <span className="text-sm text-gray-500">{tenant?.name}</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user?.email}</span>
        <button
          onClick={() => logout.mutate()}
          className="text-sm text-gray-400 hover:text-danger transition-colors"
        >
          退出
        </button>
      </div>
    </header>
  );
}
