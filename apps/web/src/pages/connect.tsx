import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useServers } from "../hooks/use-servers.js";
import { useKeys } from "../hooks/use-keys.js";
import { api } from "../lib/api.js";
import { CodeBlock } from "../components/ui/code-block.js";
import { GlassCard } from "../components/ui/glass-card.js";
import { Button } from "../components/ui/button.js";
import { Select } from "../components/ui/field.js";
import { PageHeader } from "../components/layout/page-header.js";
import { Icon } from "../components/ui/icon.js";
import { cn } from "../lib/utils.js";
import type { GenerateConfigOutput, ConnectTestOutput } from "@mcp-hub/shared";

const steps = ["选择服务器", "选择密钥", "测试连接", "生成配置"];

export function Connect() {
  const { data: servers } = useServers();
  const { data: keys } = useKeys();
  const [step, setStep] = useState(1);
  const [selectedServerId, setSelectedServerId] = useState("");
  const [selectedKeyId, setSelectedKeyId] = useState("");
  const [testResult, setTestResult] = useState<ConnectTestOutput | null>(null);
  const [config, setConfig] = useState<GenerateConfigOutput | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    const server = servers?.items.find((s) => s.id === selectedServerId);
    if (!server) return;
    setTesting(true);
    try {
      const res = await api
        .post("connect/test", {
          json: { endpoint: server.endpoint, transport: server.transport, authType: server.authType },
        })
        .json<ConnectTestOutput>();
      setTestResult(res);
      if (res.success) setStep(4);
    } finally {
      setTesting(false);
    }
  };

  const handleGenerate = async () => {
    const res = await api
      .post("connect/generate", { json: { serverId: selectedServerId, keyId: selectedKeyId || undefined } })
      .json<GenerateConfigOutput>();
    setConfig(res);
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="连接向导" description="生成 Claude Desktop / 客户端接入配置" />

      {/* 步骤指示器 —— 横向带连接线 */}
      <div className="flex items-center mb-8">
        {steps.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border transition-colors",
                    done && "bg-accent text-accent-on border-accent",
                    active && "bg-accent-soft text-accent border-accent",
                    !done && !active && "bg-surface text-ink-faint border-border-default"
                  )}
                >
                  {done ? <Icon name="check" className="w-3.5 h-3.5" strokeWidth={2} /> : n}
                </span>
                <span
                  className={cn(
                    "text-xs whitespace-nowrap",
                    (done || active) ? "text-ink-strong font-medium" : "text-ink-faint"
                  )}
                >
                  {label}
                </span>
              </div>
              {n < steps.length && (
                <div className={cn("flex-1 h-px mx-3", done ? "bg-accent" : "bg-border-default")} />
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <Step key="s1">
            <h2 className="text-sm font-medium text-ink-strong mb-3">选择 MCP Server</h2>
            <Select
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              className="mb-4"
            >
              <option value="">请选择服务器</option>
              {servers?.items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}（{s.transport}）
                </option>
              ))}
            </Select>
            <Button variant="primary" icon="chevron-right" iconPosition="right" disabled={!selectedServerId} onClick={() => setStep(2)}>
              下一步
            </Button>
          </Step>
        )}

        {step === 2 && (
          <Step key="s2">
            <h2 className="text-sm font-medium text-ink-strong mb-1">选择 API Key（可选）</h2>
            <p className="text-xs text-ink-muted mb-3">若服务器需要鉴权，选择对应的密钥</p>
            <Select
              value={selectedKeyId}
              onChange={(e) => setSelectedKeyId(e.target.value)}
              className="mb-4"
            >
              <option value="">不使用密钥</option>
              {keys?.items.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.provider} — {k.label}
                </option>
              ))}
            </Select>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(1)}>上一步</Button>
              <Button variant="primary" icon="chevron-right" iconPosition="right" onClick={() => setStep(3)}>
                下一步
              </Button>
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step key="s3">
            <h2 className="text-sm font-medium text-ink-strong mb-3">测试连接</h2>
            <Button variant="primary" icon="refresh" loading={testing} onClick={handleTest} className="mb-4">
              {testing ? "测试中" : "开始测试"}
            </Button>
            {testResult && (
              <div
                className={cn(
                  "p-3 rounded-md text-sm flex items-start gap-2",
                  testResult.success ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                )}
              >
                <Icon name={testResult.success ? "check" : "alert"} className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  {testResult.success
                    ? `连接成功（延迟 ${testResult.latencyMs}ms）`
                    : `连接失败：${testResult.error}`}
                </span>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" onClick={() => setStep(2)}>上一步</Button>
              {testResult?.success && (
                <Button variant="primary" icon="chevron-right" iconPosition="right" onClick={handleGenerate}>
                  生成配置
                </Button>
              )}
            </div>
          </Step>
        )}

        {step === 4 && config && (
          <Step key="s4">
            <h2 className="text-sm font-medium text-ink-strong mb-1">Claude Desktop 配置</h2>
            <p className="text-xs text-ink-muted mb-3">将以下内容粘贴到 Claude Desktop 配置文件</p>
            <CodeBlock code={JSON.stringify(config.json, null, 2)} language="json" />
            <Button variant="secondary" icon="refresh" className="mt-4" onClick={() => { setStep(1); setConfig(null); setTestResult(null); }}>
              重新开始
            </Button>
          </Step>
        )}
      </AnimatePresence>
    </div>
  );
}

function Step({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
    >
      <GlassCard className="p-6">{children}</GlassCard>
    </motion.div>
  );
}
