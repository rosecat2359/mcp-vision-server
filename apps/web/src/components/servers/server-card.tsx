import { Link } from "react-router-dom";
import { GlassCard } from "../ui/glass-card.js";
import { StatusIndicator } from "../ui/status-indicator.js";
import { Badge } from "../ui/badge.js";
import { Icon } from "../ui/icon.js";
import type { McpServerDTO } from "@mcp-hub/shared";
import { formatDateTime } from "../../lib/utils.js";

interface ServerCardProps {
  server: McpServerDTO;
}

const authLabels: Record<string, string> = {
  bearer: "Bearer",
  mtls: "mTLS",
  none: "无鉴权",
};

export function ServerCard({ server }: ServerCardProps) {
  return (
    <Link
      to={`/dashboard/servers/${server.id}`}
      className="block group"
    >
      <GlassCard className="h-full p-5 transition-colors group-hover:border-accent group-hover:bg-surface-raised">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-md bg-surface-sunken border border-border-default flex items-center justify-center shrink-0">
              <Icon name="server" className="w-4 h-4 text-ink-muted" />
            </div>
            <h3 className="font-medium text-ink-strong truncate">{server.name}</h3>
          </div>
          <StatusIndicator status={server.status} />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge label={server.transport.toUpperCase()} variant="info" />
          <Badge label={authLabels[server.authType] ?? server.authType} />
          {server.tags.map((tag) => (
            <Badge key={tag} label={tag} />
          ))}
        </div>

        <p className="text-xs text-ink-muted truncate font-mono">{server.endpoint}</p>
        <p className="text-xs text-ink-faint mt-2">
          创建于 {formatDateTime(server.createdAt)}
        </p>
      </GlassCard>
    </Link>
  );
}
