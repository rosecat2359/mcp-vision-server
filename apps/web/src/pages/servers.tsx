import { useServers } from "../hooks/use-servers.js";
import { ServerList } from "../components/servers/server-list.js";
import { PageHeader } from "../components/layout/page-header.js";
import { Button } from "../components/ui/button.js";
import { Link } from "react-router-dom";

export function Servers() {
  const { data, isLoading } = useServers();

  return (
    <div>
      <PageHeader
        title="服务器"
        description="管理已接入的 MCP Server 实例"
        action={
          <Link to="/dashboard/servers/new">
            <Button variant="primary" icon="plus">
              添加服务器
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <ServerListSkeleton />
      ) : (
        <ServerList servers={data?.items ?? []} />
      )}
    </div>
  );
}

// 骨架屏 —— 替代纯文本"加载中"
function ServerListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-36 bg-surface border border-border-default rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}
