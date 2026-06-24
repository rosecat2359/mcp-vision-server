import { useState } from "react";
import { copyToClipboard } from "../../lib/utils.js";
import { Icon } from "./icon.js";

interface CodeBlockProps {
  code: string;
  language?: "json" | "yaml";
}

// 代码块 —— 深色但非纯黑非终端绿，中性墨色，克制
export function CodeBlock({ code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative bg-ink-strong rounded-lg border border-border-default overflow-x-auto">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 text-xs text-ink-faint hover:text-surface bg-white/5 hover:bg-white/10 rounded-md transition-colors"
        aria-label="复制代码"
      >
        <Icon name={copied ? "check" : "copy"} className="w-3.5 h-3.5" />
        {copied ? "已复制" : "复制"}
      </button>
      <pre className="text-sm text-surface/90 font-mono p-4 pr-20 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
