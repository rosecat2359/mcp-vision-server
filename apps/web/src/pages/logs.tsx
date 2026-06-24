import { useConnectionLogs } from "../hooks/use-logs.js";
import { GlassCard } from "../components/ui/glass-card.js";
import { PageHeader } from "../components/layout/page-header.js";
import { EmptyState } from "../components/ui/empty-state.js";
import { formatDateTime, cn } from "../lib/utils.js";

const eventStyle: Record<string, { cls: string; label: string }> = {
  connected: { cls: "bg-success-soft text-success", label: "已连接" },
  disconnected: { cls: "bg-danger-soft text-danger", label: "已断开" },
  error: { cls: "bg-warning-soft text-warning", label: "错误" },
};

export function Logs() {
  const { data, isLoading } = useConnectionLogs();

  return (
    <div>
      <PageHeader title="连接日志" description="所有 MCP Server 的连接事件记录" />

      {isLoading ? (
        <div className="h-64 bg-surface border border-border-default rounded-lg animate-pulse" />
      ) : (data?.items.length ?? 0) === 0 ? (
        <GlassCard>
          <EmptyState
            icon="logs"
            title="暂无日志"
            description="当服务器发生连接事件时，记录会显示在这里"
          />
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken border-b border-border-default">
                <tr>
                  {["时间", "服务器", "事件", "消息"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-ink-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {data?.items.map((log) => {
                  const ev = eventStyle[log.event] ?? { cls: "bg-surface-sunken text-ink-muted", label: log.event };
                  return (
                    <tr key={log.id} className="hover:bg-surface-sunken/50 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-ink-muted font-mono whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink-muted font-mono">
                        {log.serverId.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("inline-block px-2 py-0.5 text-xs rounded-sm", ev.cls)}>
                          {ev.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink-muted">
                        {log.message || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
