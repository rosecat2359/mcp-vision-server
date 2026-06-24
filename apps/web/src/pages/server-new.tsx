import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateServer } from "../hooks/use-servers.js";
import { Input, Select, Field } from "../components/ui/field.js";
import { Button } from "../components/ui/button.js";
import { GlassCard } from "../components/ui/glass-card.js";
import { PageHeader } from "../components/layout/page-header.js";

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
    <div className="max-w-2xl">
      <PageHeader title="添加服务器" description="注册一个新的 MCP Server 实例" />

      <GlassCard className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="名称" required>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-mcp-server"
              required
            />
          </Field>

          <Field label="传输模式" hint="SSE 为 HTTP 长连接，stdio 通过 SSH 代理本地进程">
            <Select
              value={transport}
              onChange={(e) => setTransport(e.target.value as "sse" | "stdio")}
            >
              <option value="sse">SSE（HTTP 长连接）</option>
              <option value="stdio">stdio（SSH 代理）</option>
            </Select>
          </Field>

          <Field label="端点" required>
            <Input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="font-mono"
              placeholder={
                transport === "sse"
                  ? "https://mcp.example.com/sse"
                  : "ssh://user@host:/path/to/server"
              }
              required
            />
          </Field>

          <Field label="鉴权方式">
            <Select
              value={authType}
              onChange={(e) => setAuthType(e.target.value as "bearer" | "mtls" | "none")}
            >
              <option value="bearer">Bearer Token</option>
              <option value="mtls">mTLS</option>
              <option value="none">无鉴权</option>
            </Select>
          </Field>

          {authType !== "none" && (
            <Field label="API Key / Token">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono"
                placeholder="sk-..."
              />
            </Field>
          )}

          <Field label="标签" hint="用逗号分隔多个标签">
            <Input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="production, claude"
            />
          </Field>

          {createServer.isError && (
            <p className="text-sm text-danger flex items-center gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-danger" />
              {(createServer.error as Error)?.message || "创建失败"}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={createServer.isPending}
            >
              {createServer.isPending ? "创建中" : "创建服务器"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/dashboard/servers")}
            >
              取消
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
