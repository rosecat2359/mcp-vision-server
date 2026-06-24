import { Link } from "react-router-dom";
import { Icon } from "../components/ui/icon.js";

const features = [
  { icon: "server" as const, title: "集中管理", desc: "统一管理多个 MCP Server 实例，实时监控连接状态" },
  { icon: "key" as const, title: "密钥托管", desc: "API Key 加密存储，脱敏展示，按需明文查看" },
  { icon: "plug" as const, title: "一键生成", desc: "向导式生成 Claude Desktop 标准接入配置" },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* 顶栏 */}
      <header className="h-16 border-b border-border-default flex items-center justify-between px-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
            <Icon name="terminal" className="w-4 h-4 text-accent-on" strokeWidth={2} />
          </div>
          <span className="font-semibold text-ink-strong">MCP Hub</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/auth/login"
            className="px-3.5 py-2 text-sm text-ink-muted hover:text-ink transition-colors"
          >
            登录
          </Link>
          <Link
            to="/auth/register"
            className="px-3.5 py-2 text-sm font-medium bg-accent text-accent-on rounded-md hover:bg-accent-hover transition-colors"
          >
            开始使用
          </Link>
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        <div className="max-w-3xl text-center">
          <h1 className="text-4xl font-semibold text-ink-strong tracking-tight mb-4 text-balance">
            MCP Server 的统一管理平台
          </h1>
          <p className="text-base text-ink-muted leading-relaxed max-w-xl mx-auto mb-8 text-pretty">
            注册、配置、监控你的远程 MCP Server，加密托管 API Key，生成标准连接配置。
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/auth/register"
              className="px-5 py-2.5 text-sm font-medium bg-accent text-accent-on rounded-md hover:bg-accent-hover transition-colors"
            >
              免费注册
            </Link>
            <Link
              to="/auth/login"
              className="px-5 py-2.5 text-sm font-medium text-ink border border-border-strong rounded-md hover:bg-surface-sunken transition-colors"
            >
              登录
            </Link>
          </div>
        </div>

        {/* 特性区 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px mt-16 max-w-4xl w-full bg-border-default rounded-lg overflow-hidden border border-border-default">
          {features.map((f) => (
            <div key={f.title} className="bg-surface p-6">
              <div className="w-9 h-9 rounded-md bg-accent-soft flex items-center justify-center mb-3">
                <Icon name={f.icon} className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-sm font-medium text-ink-strong mb-1">{f.title}</h3>
              <p className="text-xs text-ink-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="h-12 border-t border-border-default flex items-center justify-center text-xs text-ink-faint">
        MCP Hub · 远程 MCP Server 部署与连接管理
      </footer>
    </div>
  );
}
