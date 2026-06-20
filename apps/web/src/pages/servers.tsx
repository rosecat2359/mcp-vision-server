import { Link } from "react-router-dom";
import { useServers } from "../hooks/use-servers.js";
import { ServerList } from "../components/servers/server-list.js";

export function Servers() {
  const { data, isLoading } = useServers();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">MCP Servers</h2>
        <Link
          to="/dashboard/servers/new"
          className="px-6 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-900 transition-colors"
        >
          + 添加 Server
        </Link>
      </div>

      {isLoading ? (
        <p className="text-gray-400">加载中...</p>
      ) : (
        <ServerList servers={data?.items ?? []} />
      )}
    </div>
  );
}
