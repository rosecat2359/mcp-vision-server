import { Icon, type IconName } from "./icon.js";

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

// 空态 —— 线性图标，非 emoji。教用户下一步，非"这里什么都没有"
export function EmptyState({
  icon = "server",
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-lg bg-surface-sunken border border-border-default flex items-center justify-center mb-4">
        <Icon name={icon} className="w-6 h-6 text-ink-faint" />
      </div>
      <h3 className="text-base font-medium text-ink-strong">{title}</h3>
      {description && (
        <p className="text-sm text-ink-muted mt-1.5 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
