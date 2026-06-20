import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/utils.js";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        "bg-white/88 backdrop-blur-xl rounded-2xl border border-border-default p-6 shadow-sm",
        className
      )}
      whileHover={{ scale: 1.02, y: -2, transition: { type: "spring", stiffness: 600 } }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
