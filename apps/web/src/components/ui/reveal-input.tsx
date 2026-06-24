import { useState } from "react";
import { Icon } from "./icon.js";

interface RevealInputProps {
  value: string;
  label: string;
}

// 密钥显示/隐藏 —— 实色输入框，图标切换按钮
export function RevealInput({ value, label }: RevealInputProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div>
      <label className="block text-xs font-medium text-ink-muted mb-1.5">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type={revealed ? "text" : "password"}
          value={revealed ? value : "••••••••••••••••"}
          readOnly
          className="flex-1 px-3 py-2 border border-border-default rounded-md bg-surface-sunken font-mono text-sm text-ink outline-none focus:border-accent focus:bg-surface transition-colors"
        />
        <button
          type="button"
          onClick={() => setRevealed(!revealed)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-ink-muted border border-border-default rounded-md hover:bg-surface-sunken hover:text-ink transition-colors"
          aria-label={revealed ? "隐藏" : "显示"}
        >
          <Icon name={revealed ? "eye-off" : "eye"} className="w-4 h-4" />
          {revealed ? "隐藏" : "显示"}
        </button>
      </div>
    </div>
  );
}
