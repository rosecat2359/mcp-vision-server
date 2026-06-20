import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCreateServer } from "../hooks/use-servers.js";
import { pageTransition, pageTransitionConfig } from "../lib/motion.js";

export function ServerNew() {
  const navigate = useNavigate();
  const createServer = useCreateServer();
  const [name, setName] = useState("");
  const [transport, setTransport] = useState<"sse" | "stdio">("sse");
  const [endpoint, setEndpoint] = useState("");
  const [authType, setAuthType] = useState<"bearer" | "mtls" | "none">("bearer");
  const [apiKey, setApiKey] = useState("");
  const [tags, setTags] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createServer.mutate(
      {
        name,
        transport,
        endpoint,
        authType,
        apiKey: apiKey || undefined,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      },
      { onSuccess: () => navigate("/dashboard/servers") }
    );
  };

  return (
    <motion.div
      variants={pageTransition} initial="initial" animate="animate" transition={pageTransitionConfig}
      className="max-w-2xl"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-6">添加 MCP Server</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">名称 *</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-border-default rounded-xl focus:border-border-focus outline-none bg-white/60"
            placeholder="my-mcp-server" required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">传输模式</label>
          <select
            value={transport} onChange={(e) => setTransport(e.target.value as "sse" | "stdio")}
            className="w-full px-4 py-2 border border-border-default rounded-xl bg-white/60 outline-none"
          >
            <option value="sse">SSE (HTTP 长连接)</option>
            <option value="stdio">stdio (SSH 代理)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">端点 *</label>
          <input
            type="text" value={endpoint} onChange={(e) => setEndpoint(e.target.value)}
            className="w-full px-4 py-2 border border-border-default rounded-xl focus:border-border-focus outline-none bg-white/60 font-mono text-sm"
            placeholder={transport === "sse" ? "https://mcp.example.com/sse" : "ssh://user@host:/path/to/server"}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">鉴权方式</label>
          <select
            value={authType} onChange={(e) => setAuthType(e.target.value as "bearer" | "mtls" | "none")}
            className="w-full px-4 py-2 border border-border-default rounded-xl bg-white/60 outline-none"
          >
            <option value="bearer">Bearer Token</option>
            <option value="mtls">mTLS</option>
            <option value="none">无鉴权</option>
          </select>
        </div>
        {authType !== "none" && (
          <div>
            <label className="block text-sm font-medium mb-1">API Key / Token</label>
            <input
              type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-2 border border-border-default rounded-xl focus:border-border-focus outline-none bg-white/60 font-mono text-sm"
              placeholder="sk-..."
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1">标签 (逗号分隔)</label>
          <input
            type="text" value={tags} onChange={(e) => setTags(e.target.value)}
            className="w-full px-4 py-2 border border-border-default rounded-xl focus:border-border-focus outline-none bg-white/60"
            placeholder="production, claude"
          />
        </div>

        {createServer.isError && (
          <p className="text-danger text-sm">{(createServer.error as Error)?.message || "创建失败"}</p>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit" disabled={createServer.isPending}
            className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-900 transition-colors disabled:opacity-50"
          >
            {createServer.isPending ? "创建中..." : "创建 Server"}
          </button>
          <button
            type="button" onClick={() => navigate("/dashboard/servers")}
            className="px-6 py-2 border border-border-strong rounded-xl hover:bg-white/50 transition-colors"
          >
            取消
          </button>
        </div>
      </form>
    </motion.div>
  );
}
