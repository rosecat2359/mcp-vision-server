import { ServerCard } from "./server-card.js";
import { EmptyState } from "../ui/empty-state.js";
import { Button } from "../ui/button.js";
import type { McpServerDTO } from "@mcp-hub/shared";
import { Link } from "react-router-dom";

interface ServerListProps {
  servers: McpServerDTO[];
}

export function ServerList({ servers }: ServerListProps) {
  if (servers.length === 0) {
    return (
      <EmptyState
        icon="server"
        title="还没有服务器"
        description="添加你的第一个 MCP Server，开始集中管理远程工具调用"
        action={
          <Link to="/dashboard/servers/new">
            <Button variant="primary" icon="plus">
              添加服务器
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {servers.map((server) => (
        <ServerCard key={server.id} server={server} />
      ))}
    </div>
  );
}
