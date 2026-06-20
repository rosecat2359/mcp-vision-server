import { ServerCard } from "./server-card.js";
import { EmptyState } from "../ui/empty-state.js";
import type { McpServerDTO } from "@mcp-hub/shared";
import { Link } from "react-router-dom";

interface ServerListProps {
  servers: McpServerDTO[];
}

export function ServerList({ servers }: ServerListProps) {
  if (servers.length === 0) {
    return (
      <EmptyState
        icon="🖥"
        title="还没有 MCP Server"
        description="注册你的第一个 MCP Server 开始使用"
        action={
          <Link
            to="/dashboard/servers/new"
            className="px-6 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-900 transition-colors"
          >
            添加 Server
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {servers.map((server, i) => (
        <ServerCard key={server.id} server={server} index={i} />
      ))}
    </div>
  );
}
