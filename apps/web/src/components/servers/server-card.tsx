import { Link } from "react-router-dom";
import { GlassCard } from "../ui/glass-card.js";
import { StatusIndicator } from "../ui/status-indicator.js";
import { Badge } from "../ui/badge.js";
import type { McpServerDTO } from "@mcp-hub/shared";
import { formatDateTime } from "../../lib/utils.js";

interface ServerCardProps {
  server: McpServerDTO;
  index: number;
}

export function ServerCard({ server, index }: ServerCardProps) {
  return (
    <Link to={`/dashboard/servers/${server.id}`}>
      <GlassCard
        className="h-full cursor-pointer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 24 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-primary-600">{server.name}</h3>
          <StatusIndicator status={server.status} />
        </div>
        <div className="flex gap-2 mb-3">
          <Badge label={server.transport.toUpperCase()} variant="info" />
          <Badge
            label={server.authType === "bearer" ? "Bearer Auth" : server.authType === "mtls" ? "mTLS" : "无鉴权"}
            variant="default"
          />
          {server.tags.map((tag) => (
            <Badge key={tag} label={tag} />
          ))}
        </div>
        <p className="text-xs text-gray-400 truncate">{server.endpoint}</p>
        <p className="text-xs text-gray-300 mt-2">创建于 {formatDateTime(server.createdAt)}</p>
      </GlassCard>
    </Link>
  );
}
