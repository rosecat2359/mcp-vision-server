import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useKeys, useCreateKey, useRevealKey, useTestKey, useDeleteKey } from "../hooks/use-keys.js";
import { pageTransition, pageTransitionConfig, modalSpring, modalSpringConfig } from "../lib/motion.js";
import { formatDateTime } from "../lib/utils.js";
import { EmptyState } from "../components/ui/empty-state.js";
import { Badge } from "../components/ui/badge.js";

export function Keys() {
  const { data, isLoading } = useKeys();
  const createKey = useCreateKey();
  const revealKey = useRevealKey();
  const testKey = useTestKey();
  const deleteKey = useDeleteKey();

  const [showForm, setShowForm] = useState(false);
  const [provider, setProvider] = useState("anthropic");
  const [label, setLabel] = useState("");
  const [plainKey, setPlainKey] = useState("");

  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealModal, setRevealModal] = useState(false);

  const handleCreate = async () => {
    await createKey.mutateAsync({ provider, label: label || provider, plainKey });
    setShowForm(false);
    setPlainKey("");
  };

  const handleReveal = async (id: string) => {
    const result = await revealKey.mutateAsync(id);
    setRevealedKey(result.plainKey);
    setRevealModal(true);
  };

  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" transition={pageTransitionConfig}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">API Keys</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-900 transition-colors"
        >
          + 添加 Key
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            variants={modalSpring} initial="initial" animate="animate" exit="exit" transition={modalSpringConfig}
            className="mb-6 bg-white/88 backdrop-blur-xl rounded-2xl border border-border-default p-6"
          >
            <h3 className="font-semibold mb-4">添加 API Key</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Provider</label>
                <select value={provider} onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-4 py-2 border border-border-default rounded-xl bg-white/60">
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="groq">Groq</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">标签</label>
                <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-4 py-2 border border-border-default rounded-xl bg-white/60" placeholder="My Key" />
              </div>
              <div>
                <label className="text-sm font-medium">API Key</label>
                <input type="password" value={plainKey} onChange={(e) => setPlainKey(e.target.value)}
                  className="w-full px-4 py-2 border border-border-default rounded-xl bg-white/60 font-mono text-sm" placeholder="sk-..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleCreate} disabled={!plainKey || createKey.isPending}
                  className="px-6 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-900 transition-colors disabled:opacity-50">
                  保存
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-6 py-2 border border-border-strong rounded-xl text-sm hover:bg-white/50 transition-colors">
                  取消
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? <p className="text-gray-400">加载中...</p> : (data?.items.length === 0 ? (
        <EmptyState icon="🔑" title="还没有 API Key" description="添加你的第一个 API Key 开始使用" />
      ) : (
        <div className="space-y-3">
          {data?.items.map((key) => (
            <div key={key.id} className="bg-white/88 backdrop-blur-xl rounded-2xl border border-border-default p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge label={key.provider} variant="info" />
                  <span className="font-medium">{key.label}</span>
                </div>
                <p className="text-sm font-mono text-gray-400">{key.keyPreview}</p>
                <p className="text-xs text-gray-300">
                  创建于 {formatDateTime(key.createdAt)}
                  {key.isValid !== null && (
                    <span className={key.isValid ? "text-success ml-2" : "text-danger ml-2"}>
                      {key.isValid ? "✓ 有效" : "✗ 无效"}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleReveal(key.id)}
                  className="px-3 py-1 text-xs border border-border-strong rounded-lg hover:bg-white/50 transition-colors">
                  查看
                </button>
                <button onClick={() => testKey.mutate(key.id)}
                  className="px-3 py-1 text-xs border border-border-strong rounded-lg hover:bg-white/50 transition-colors">
                  测试
                </button>
                <button onClick={() => { if (confirm("确定删除？")) deleteKey.mutate(key.id); }}
                  className="px-3 py-1 text-xs border border-danger text-danger rounded-lg hover:bg-red-50 transition-colors">
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      <AnimatePresence>
        {revealModal && revealedKey && (
          <motion.div
            variants={modalSpring} initial="initial" animate="animate" exit="exit" transition={modalSpringConfig}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
            onClick={() => { setRevealModal(false); setRevealedKey(null); }}
          >
            <div className="bg-white rounded-2xl border border-border-default p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold mb-4">API Key 明文</h3>
              <input
                type="text" value={revealedKey} readOnly
                className="w-full px-4 py-2 border border-border-default rounded-xl bg-white/60 font-mono text-sm mb-4"
              />
              <p className="text-xs text-gray-400 mb-4">关闭此窗口后明文将被清除，请妥善保存。</p>
              <button
                onClick={() => { setRevealModal(false); setRevealedKey(null); }}
                className="w-full py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-900 transition-colors"
              >
                关闭
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
