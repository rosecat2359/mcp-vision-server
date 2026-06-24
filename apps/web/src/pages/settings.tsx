import { useAuthStore } from "../lib/auth.js";
import { GlassCard } from "../components/ui/glass-card.js";
import { PageHeader } from "../components/layout/page-header.js";
import { Badge } from "../components/ui/badge.js";

const roleLabels: Record<string, { label: string; variant: "info" | "success" | "default" }> = {
  Admin: { label: "管理员", variant: "info" },
  Operator: { label: "操作员", variant: "success" },
  Viewer: { label: "访客", variant: "default" },
};

export function Settings() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const role = user?.role ? roleLabels[user.role] ?? { label: user.role, variant: "default" as const } : null;

  const fields = [
    { label: "工作区名称", value: tenant?.name ?? "—" },
    { label: "邮箱", value: user?.email ?? "—" },
    { label: "角色", value: role ? <Badge label={role.label} variant={role.variant} /> : "—" },
    {
      label: "注册时间",
      value: user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString("zh-CN")
        : "—",
    },
  ];

  return (
    <div className="max-w-2xl">
      <PageHeader title="设置" description="账户与工作区信息" />
      <GlassCard className="p-6">
        <dl className="divide-y divide-border-default">
          {fields.map((f) => (
            <div key={f.label} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <dt className="text-sm text-ink-muted">{f.label}</dt>
              <dd className="text-sm text-ink-strong font-medium text-right">{f.value}</dd>
            </div>
          ))}
        </dl>
      </GlassCard>
    </div>
  );
}
