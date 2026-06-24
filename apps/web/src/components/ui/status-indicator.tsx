import { cn } from "../../lib/utils.js";

interface StatusIndicatorProps {
  status: "online" | "offline" | "error";
  showLabel?: boolean;
}

// 状态点 —— 静态色点，无永动心跳。状态用颜色表达。
const dotColor = {
  online: "bg-success",
  offline: "bg-ink-faint",
  error: "bg-danger",
};

const labels = {
  online: "在线",
  offline: "离线",
  error: "错误",
};

const textColor = {
  online: "text-success",
  offline: "text-ink-muted",
  error: "text-danger",
};

export function StatusIndicator({ status, showLabel = true }: StatusIndicatorProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn("w-2 h-2 rounded-full", dotColor[status])}
        role="status"
        aria-label={labels[status]}
      />
      {showLabel && (
        <span className={cn("text-xs font-medium", textColor[status])}>
          {labels[status]}
        </span>
      )}
    </span>
  );
}
