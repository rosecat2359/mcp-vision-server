import { motion } from "framer-motion";
import { statusPulse } from "../../lib/motion.js";

interface StatusIndicatorProps {
  status: "online" | "offline" | "error";
}

const colors = {
  online: "bg-success",
  offline: "bg-gray-400",
  error: "bg-danger",
};

const labels = {
  online: "在线",
  offline: "离线",
  error: "错误",
};

export function StatusIndicator({ status }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <motion.span
        className={`w-2.5 h-2.5 rounded-full ${colors[status]}`}
        {...(status === "online" ? statusPulse : {})}
      />
      <span className="text-sm text-gray-500">{labels[status]}</span>
    </div>
  );
}
