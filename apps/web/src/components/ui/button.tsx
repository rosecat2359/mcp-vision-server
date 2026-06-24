import { cn } from "../../lib/utils.js";
import { Icon, type IconName } from "./icon.js";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconPosition?: "left" | "right";
  loading?: boolean;
}

// 统一按钮词汇表 —— 8px 圆角，实色，无 spring。primary=强调，secondary=描边，ghost=透明，danger=错误色
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-on border border-accent hover:bg-accent-hover active:bg-accent-active",
  secondary:
    "bg-surface text-ink border border-border-strong hover:bg-surface-sunken hover:border-accent",
  ghost:
    "bg-transparent text-ink-muted border border-transparent hover:bg-surface-sunken hover:text-ink",
  danger:
    "bg-danger text-surface border border-danger hover:brightness-95 active:brightness-90",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-xs px-2.5 py-1.5 gap-1.5",
  md: "text-sm px-3.5 py-2 gap-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconPosition = "left",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-md transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Icon name="refresh" className="w-4 h-4 animate-spin" />}
      {!loading && icon && iconPosition === "left" && (
        <Icon name={icon} className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      )}
      {children}
      {!loading && icon && iconPosition === "right" && (
        <Icon name={icon} className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      )}
    </button>
  );
}
