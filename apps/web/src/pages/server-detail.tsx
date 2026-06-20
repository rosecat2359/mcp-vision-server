import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useServer, useDeleteServer, usePingServer } from "../hooks/use-servers.js";
import { StatusIndicator } from "../components/ui/status-indicator.js";
import { Badge } from "../components/ui/badge.js";
import { pageTransition, pageTransitionConfig } from "../lib/motion.js";
import { formatDateTime, formatLatency } from "../lib/utils.js";

export function ServerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: server, isLoading } = useServer(id!);
  const pingServer = usePingServer();
  const deleteServer = useDeleteServer();

  if (isLoading) return <p className="text-gray-400">加载中...</p>;
  if (!server) return <p className="text-danger">Server 不存在</p>;

  const handleDelete = async () => {
    if (confirm(`确定删除 "${server.name}"？此操作不可撤销。`)) {
      deleteServer.mutate(server.id, { onSuccess: () => navigate("/dashboard/servers") });
    }
  };

  return (
    <motion.div
      variants={pageTransition} initial="initial" animate="animate" transition={pageTransitionConfig}
      className="max-w-2xl"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{server.name}</h2>
        <StatusIndicator status={server.status} />
      </div>

      <div className="bg-white/72 backdrop-blur-xl rounded-2xl border border-border-default p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-400">传输模式</span><p className="font-medium">{server.transport.toUpperCase()}</p></div>
          <div><span className="text-gray-400">鉴权方式</span><p className="font-medium">{server.authType}</p></div>
          <div className="col-span-2"><span className="text-gray-400">端点</span><p className="font-medium font-mono">{server.endpoint}</p></div>
          <div><span className="text-gray-400">创建时间</span><p className="font-medium">{formatDateTime(server.createdAt)}</p></div>
          <div><span className="text-gray-400">最近 Ping</span><p className="font-medium">{server.lastPing ? formatDateTime(server.lastPing) : "从未"}</p></div>
        </div>

        {server.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {server.tags.map((tag) => <Badge key={tag} label={tag} />)}
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-border-default">
          <button
            onClick={() => pingServer.mutate(server.id)}
            disabled={pingServer.isPending}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-900 transition-colors disabled:opacity-50"
          >
            {pingServer.isPending ? "Pinging..." : "Ping Now"}
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 border border-danger text-danger rounded-xl text-sm hover:bg-red-50 transition-colors"
          >
            删除
          </button>
        </div>
      </div>

      {/* Recent Logs */}
      {server.recentLogs.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-gray-700 mb-3">最近日志</h3>
          <div className="bg-white/60 rounded-xl border border-border-default divide-y divide-border-default">
            {server.recentLogs.map((log) => (
              <div key={log.id} className="px-4 py-2 text-sm flex justify-between">
                <span className="font-mono text-gray-600">{log.event}</span>
                <span className="text-gray-400">{formatDateTime(log.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
