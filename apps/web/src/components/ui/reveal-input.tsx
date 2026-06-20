import { useState } from "react";

interface RevealInputProps {
  value: string;
  label: string;
}

export function RevealInput({ value, label }: RevealInputProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type={revealed ? "text" : "password"}
          value={revealed ? value : "••••••••••••••••"}
          readOnly
          className="flex-1 px-4 py-2 border border-border-default rounded-xl bg-white/60 font-mono text-sm outline-none"
        />
        <button
          onClick={() => setRevealed(!revealed)}
          className="px-4 py-2 text-sm border border-border-default rounded-xl hover:bg-white/50 transition-colors"
        >
          {revealed ? "隐藏" : "显示"}
        </button>
      </div>
    </div>
  );
}
