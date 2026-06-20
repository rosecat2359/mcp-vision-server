import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServers } from "../hooks/use-servers.js";
import { useKeys } from "../hooks/use-keys.js";
import { api } from "../lib/api.js";
import { pageTransition, pageTransitionConfig } from "../lib/motion.js";
import { CodeBlock } from "../components/ui/code-block.js";
import type { GenerateConfigOutput, ConnectTestOutput } from "@mcp-hub/shared";

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
    const res = await api.post("connect/test", { json: { endpoint: server.endpoint, transport: server.transport, authType: server.authType } }).json<ConnectTestOutput>();
    setTestResult(res);
    setTesting(false);
    if (res.success) setStep(4);
  };

  const handleGenerate = async () => {
    const res = await api.post("connect/generate", { json: { serverId: selectedServerId, keyId: selectedKeyId || undefined } }).json<GenerateConfigOutput>();
    setConfig(res);
  };

  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" transition={pageTransitionConfig} className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">连接配置向导</h2>

      {/* Steps */}
      <div className="flex gap-4 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`flex items-center gap-2 text-sm ${step >= s ? "text-primary-600 font-medium" : "text-gray-400"}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= s ? "bg-primary-600 text-white" : "bg-gray-200"}`}>{s}</span>
            {["选 Server", "选 Key", "测试", "生成"][s - 1]}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1" variants={pageTransition} initial="initial" animate="animate" exit="exit" transition={pageTransitionConfig}>
            <h3 className="font-semibold mb-3">选择 MCP Server</h3>
            <select value={selectedServerId} onChange={(e) => setSelectedServerId(e.target.value)}
              className="w-full px-4 py-2 border border-border-default rounded-xl bg-white/60 mb-4">
              <option value="">-- 选择 --</option>
              {servers?.items.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.transport})</option>)}
            </select>
            <button onClick={() => setStep(2)} disabled={!selectedServerId}
              className="px-6 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-900 transition-colors disabled:opacity-50">
              下一步
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" variants={pageTransition} initial="initial" animate="animate" exit="exit" transition={pageTransitionConfig}>
            <h3 className="font-semibold mb-3">选择 API Key (可选)</h3>
            <select value={selectedKeyId} onChange={(e) => setSelectedKeyId(e.target.value)}
              className="w-full px-4 py-2 border border-border-default rounded-xl bg-white/60 mb-4">
              <option value="">-- 不使用 --</option>
              {keys?.items.map((k) => <option key={k.id} value={k.id}>{k.provider} — {k.label}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-6 py-2 border border-border-strong rounded-xl text-sm hover:bg-white/50 transition-colors">上一步</button>
              <button onClick={() => setStep(3)} className="px-6 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-900 transition-colors">下一步</button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" variants={pageTransition} initial="initial" animate="animate" exit="exit" transition={pageTransitionConfig}>
            <h3 className="font-semibold mb-3">测试连接</h3>
            <button onClick={handleTest} disabled={testing}
              className="px-6 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-900 transition-colors disabled:opacity-50 mb-4">
              {testing ? "测试中..." : "开始测试"}
            </button>
            {testResult && (
              <div className={`p-4 rounded-xl ${testResult.success ? "bg-green-50 text-success" : "bg-red-50 text-danger"} text-sm`}>
                {testResult.success ? `✓ 连接成功 (${testResult.latencyMs}ms)` : `✗ 连接失败: ${testResult.error}`}
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep(2)} className="px-6 py-2 border border-border-strong rounded-xl text-sm hover:bg-white/50 transition-colors">上一步</button>
              {testResult?.success && (
                <button onClick={handleGenerate} className="px-6 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-900 transition-colors">生成配置</button>
              )}
            </div>
          </motion.div>
        )}

        {step === 4 && config && (
          <motion.div key="s4" variants={pageTransition} initial="initial" animate="animate" exit="exit" transition={pageTransitionConfig}>
            <h3 className="font-semibold mb-3">Claude Desktop 配置</h3>
            <CodeBlock code={JSON.stringify(config.json, null, 2)} language="json" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep(1)} className="px-6 py-2 border border-border-strong rounded-xl text-sm hover:bg-white/50 transition-colors">重新开始</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
