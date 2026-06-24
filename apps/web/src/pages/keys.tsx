import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useKeys, useCreateKey, useRevealKey, useTestKey, useDeleteKey } from "../hooks/use-keys.js";
import { formatDateTime, copyToClipboard } from "../lib/utils.js";
import { EmptyState } from "../components/ui/empty-state.js";
import { Badge } from "../components/ui/badge.js";
import { GlassCard } from "../components/ui/glass-card.js";
import { Button } from "../components/ui/button.js";
import { Input, Select, Field } from "../components/ui/field.js";
import { PageHeader } from "../components/layout/page-header.js";
import { Icon } from "../components/ui/icon.js";

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
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    await createKey.mutateAsync({ provider, label: label || provider, plainKey });
    setShowForm(false);
    setPlainKey("");
    setLabel("");
  };

  const handleReveal = async (id: string) => {
    const result = await revealKey.mutateAsync(id);
    setRevealedKey(result.plainKey);
    setRevealModal(true);
  };

  const handleCopy = async () => {
    if (!revealedKey) return;
    await copyToClipboard(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <PageHeader
        title="API 密钥"
        description="集中管理各 Provider 的 API Key，加密存储"
        action={
          <Button
            variant={showForm ? "secondary" : "primary"}
            icon={showForm ? "x" : "plus"}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "取消" : "添加密钥"}
          </Button>
        }
      />

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.16 }}
            className="overflow-hidden mb-6"
          >
            <GlassCard className="p-6">
              <h2 className="text-sm font-medium text-ink-strong mb-4">添加 API Key</h2>
              <div className="space-y-4">
                <Field label="Provider">
                  <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
                    <option value="anthropic">Anthropic</option>
                    <option value="openai">OpenAI</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="groq">Groq</option>
                    <option value="custom">自定义</option>
                  </Select>
                </Field>
                <Field label="标签">
                  <Input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="My Key"
                  />
                </Field>
                <Field label="API Key">
                  <Input
                    type="password"
                    value={plainKey}
                    onChange={(e) => setPlainKey(e.target.value)}
                    className="font-mono"
                    placeholder="sk-..."
                  />
                </Field>
                <div className="flex gap-3 pt-1">
                  <Button
                    variant="primary"
                    onClick={handleCreate}
                    disabled={!plainKey || createKey.isPending}
                    loading={createKey.isPending}
                  >
                    保存
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface border border-border-default rounded-lg animate-pulse" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <EmptyState
          icon="key"
          title="还没有 API 密钥"
          description="添加你的第一个 API Key，用于连接 MCP Server 时鉴权"
        />
      ) : (
        <div className="space-y-3">
          {data?.items.map((key) => (
            <GlassCard key={key.id} className="p-4 flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge label={key.provider} variant="info" />
                  <span className="font-medium text-ink-strong">{key.label}</span>
                  {key.isValid !== null && (
                    <span
                      className={
                        key.isValid
                          ? "text-xs text-success inline-flex items-center gap-0.5"
                          : "text-xs text-danger inline-flex items-center gap-0.5"
                      }
                    >
                      <Icon name={key.isValid ? "check" : "alert"} className="w-3 h-3" />
                      {key.isValid ? "有效" : "无效"}
                    </span>
                  )}
                </div>
                <p className="text-sm font-mono text-ink-muted">{key.keyPreview}</p>
                <p className="text-xs text-ink-faint mt-0.5">
                  创建于 {formatDateTime(key.createdAt)}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="secondary" onClick={() => handleReveal(key.id)}>
                  查看
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => testKey.mutate(key.id)}
                  loading={testKey.isPending}
                >
                  测试
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon="x"
                  onClick={() => {
                    if (confirm("确定删除此密钥？")) deleteKey.mutate(key.id);
                  }}
                />
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <AnimatePresence>
        {revealModal && revealedKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-strong/40"
            onClick={() => {
              setRevealModal(false);
              setRevealedKey(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="bg-surface rounded-lg border border-border-default p-6 max-w-md w-full mx-4 shadow-overlay"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-base font-semibold text-ink-strong mb-1">API Key 明文</h2>
              <p className="text-xs text-ink-muted mb-4">
                关闭后明文将从内存清除，请立即保存。
              </p>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={revealedKey}
                  readOnly
                  className="flex-1 px-3 py-2 border border-border-default rounded-md bg-surface-sunken font-mono text-sm text-ink outline-none"
                />
                <Button variant="secondary" icon={copied ? "check" : "copy"} onClick={handleCopy}>
                  {copied ? "已复制" : "复制"}
                </Button>
              </div>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  setRevealModal(false);
                  setRevealedKey(null);
                }}
              >
                关闭
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
