import { useState } from "react";
import { copyToClipboard } from "../../lib/utils.js";

interface CodeBlockProps {
  code: string;
  language?: "json" | "yaml";
}

export function CodeBlock({ code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative bg-gray-900 rounded-xl p-4 overflow-x-auto">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-3 py-1 text-xs bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
      >
        {copied ? "已复制 ✓" : "复制"}
      </button>
      <pre className="text-sm text-green-400 font-mono"><code>{code}</code></pre>
    </div>
  );
}
