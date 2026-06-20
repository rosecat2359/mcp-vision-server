interface BadgeProps {
  label: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

const variants = {
  default: "bg-primary-50 text-primary-600 border-primary-400/20",
  success: "bg-green-50 text-success border-green-400/20",
  warning: "bg-amber-50 text-warning border-amber-400/20",
  danger: "bg-red-50 text-danger border-red-400/20",
  info: "bg-blue-50 text-info border-blue-400/20",
};

export function Badge({ label, variant = "default" }: BadgeProps) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded-full border ${variants[variant]}`}>
      {label}
    </span>
  );
}
