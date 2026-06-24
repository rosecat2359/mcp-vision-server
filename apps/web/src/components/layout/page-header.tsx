interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

// 页面标题区 —— 统一各页面顶部。标题 + 描述 + 操作
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-ink-strong tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-ink-muted mt-1">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
