import { cn } from "../../lib/utils.js";

// 面板 —— 实色卡片，去毛玻璃。1px 边框，不叠加宽阴影。
// 保留 GlassCard 导出名以兼容现有引用。
interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  as?: "div" | "section" | "article";
}

export function GlassCard({ children, className, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-border-default rounded-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// 显式语义导出
export const Panel = GlassCard;
