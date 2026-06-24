import { Icon } from "../ui/icon.js";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-md bg-accent flex items-center justify-center">
            <Icon name="terminal" className="w-5 h-5 text-accent-on" strokeWidth={2} />
          </div>
          <span className="text-lg font-semibold text-ink-strong tracking-tight">MCP Hub</span>
        </div>

        <div className="bg-surface border border-border-default rounded-lg p-7 shadow-panel">
          <h1 className="text-lg font-semibold text-ink-strong mb-1">{title}</h1>
          <p className="text-sm text-ink-muted mb-6">{subtitle}</p>
          {children}
        </div>

        <p className="text-center text-sm text-ink-muted mt-5">{footer}</p>
      </div>
    </div>
  );
}
