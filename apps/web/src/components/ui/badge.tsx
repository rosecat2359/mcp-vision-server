import { cn } from "../../lib/utils.js";

interface BadgeProps {
  label: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

// 软标签 —— 淡底 + 语义色文字，方角，非全圆胶囊
const variants = {
  default: "bg-surface-sunken text-ink-muted border-border-default",
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  danger: "bg-danger-soft text-danger border-danger/20",
  info: "bg-info-soft text-info border-info/20",
};

export function Badge({ label, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-sm border",
        variants[variant]
      )}
    >
      {label}
    </span>
  );
}
