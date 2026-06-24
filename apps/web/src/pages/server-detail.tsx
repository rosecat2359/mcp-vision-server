import { useParams, useNavigate } from "react-router-dom";
import { useServer, useDeleteServer, usePingServer } from "../hooks/use-servers.js";
import { StatusIndicator } from "../components/ui/status-indicator.js";
import { Badge } from "../components/ui/badge.js";
import { GlassCard } from "../components/ui/glass-card.js";
import { Button } from "../components/ui/button.js";
import { PageHeader } from "../components/layout/page-header.js";
import { Icon } from "../components/ui/icon.js";
import { Link } from "react-router-dom";
import { formatDateTime } from "../lib/utils.js";

const authLabels: Record<string, string> = {
  bearer: "Bearer Token",
  mtls: "mTLS",
  none: "无鉴权",
};

export function ServerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: server, isLoading } = useServer(id!);
  const pingServer = usePingServer();
  const deleteServer = useDeleteServer();

  if (isLoading) {
    return <div className="h-48 bg-surface border border-border-default rounded-lg animate-pulse" />;
  }
  if (!server) {
    return (
      <div>
        <PageHeader title="服务器不存在" />
        <GlassCard className="p-8 text-center">
          <p className="text-sm text-ink-muted">该服务器可能已被删除</p>
          <Link to="/dashboard/servers" className="inline-block mt-3">
            <Button variant="secondary" icon="chevron-right" iconPosition="right">
              返回列表
            </Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  const handleDelete = async () => {
    if (confirm(`确定删除「${server.name}」？此操作不可撤销。`)) {
      deleteServer.mutate(server.id, { onSuccess: () => navigate("/dashboard/servers") });
    }
  };

  const fields = [
    { label: "传输模式", value: server.transport.toUpperCase() },
    { label: "鉴权方式", value: authLabels[server.authType] ?? server.authType },
    { label: "创建时间", value: formatDateTime(server.createdAt) },
    { label: "最近 Ping", value: server.lastPing ? formatDateTime(server.lastPing) : "从未" },
  ];

  return (
    <div>
      <PageHeader
        title={server.name}
        action={<StatusIndicator status={server.status} />}
      />

      <GlassCard className="p-6 mb-6">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-5">
          {fields.map((f) => (
            <div key={f.label}>
              <dt className="text-xs text-ink-faint mb-1">{f.label}</dt>
              <dd className="text-sm text-ink-strong font-medium">{f.value}</dd>
            </div>
          ))}
          <div className="col-span-2">
            <dt className="text-xs text-ink-faint mb-1">端点</dt>
            <dd className="text-sm text-ink-strong font-mono break-all">{server.endpoint}</dd>
          </div>
        </dl>

        {server.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-5 pt-5 border-t border-border-default">
            {server.tags.map((tag) => (
              <Badge key={tag} label={tag} />
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-5 pt-5 border-t border-border-default">
          <Button
            variant="primary"
            icon="refresh"
            loading={pingServer.isPending}
            onClick={() => pingServer.mutate(server.id)}
          >
            {pingServer.isPending ? "检测中" : "立即检测"}
          </Button>
          <Button variant="danger" icon="x" onClick={handleDelete}>
            删除
          </Button>
        </div>
      </GlassCard>

      {server.recentLogs.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-ink-strong mb-3">最近日志</h2>
          <GlassCard className="divide-y divide-border-default">
            {server.recentLogs.map((log) => (
              <div key={log.id} className="px-4 py-2.5 text-sm flex justify-between items-center">
                <span className="font-mono text-ink-muted">{log.event}</span>
                <span className="text-xs text-ink-faint">{formatDateTime(log.timestamp)}</span>
              </div>
            ))}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
