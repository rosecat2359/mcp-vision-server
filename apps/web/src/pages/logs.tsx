import { useConnectionLogs } from "../hooks/use-logs.js";
import { motion } from "framer-motion";
import { pageTransition, pageTransitionConfig } from "../lib/motion.js";
import { formatDateTime } from "../lib/utils.js";

export function Logs() {
  const { data, isLoading } = useConnectionLogs();

  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" transition={pageTransitionConfig}>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">连接日志</h2>
      {isLoading ? (
        <p className="text-gray-400">加载中...</p>
      ) : (
        <div className="bg-white/72 backdrop-blur-xl rounded-2xl border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/50 border-b border-border-default">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">时间</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Server ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">事件</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">消息</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {data?.items.map((log) => (
                <tr key={log.id} className="hover:bg-white/30">
                  <td className="px-4 py-2 text-gray-400 font-mono text-xs">{formatDateTime(log.timestamp)}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">{log.serverId.slice(0, 8)}...</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      log.event === "connected" ? "bg-green-50 text-success" :
                      log.event === "disconnected" ? "bg-red-50 text-danger" :
                      "bg-gray-50 text-gray-500"
                    }`}>
                      {log.event}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600 text-xs">{log.message || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.items.length === 0 && (
            <div className="p-8 text-center text-gray-400">暂无日志</div>
          )}
        </div>
      )}
    </motion.div>
  );
}
