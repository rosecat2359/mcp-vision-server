import { cn } from "../../lib/utils.js";

// 统一表单词汇 —— 实色输入，6px 圆角，聚焦强调色边框

const fieldBase =
  "w-full px-3 py-2 text-sm bg-surface border border-border-default rounded-md outline-none transition-colors focus:border-accent focus:bg-surface placeholder:text-ink-faint disabled:bg-surface-sunken disabled:cursor-not-allowed";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input className={cn(fieldBase, className)} {...rest} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return (
    <select className={cn(fieldBase, "cursor-pointer", className)} {...rest} />
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

export function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-muted mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-faint mt-1.5">{hint}</p>}
      {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
    </div>
  );
}
