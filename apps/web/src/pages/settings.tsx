import { motion } from "framer-motion";
import { pageTransition, pageTransitionConfig } from "../lib/motion.js";
import { useAuthStore } from "../lib/auth.js";

export function Settings() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);

  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" transition={pageTransitionConfig} className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">设置</h2>
      <div className="bg-white/72 backdrop-blur-xl rounded-2xl border border-border-default p-6 space-y-4">
        <div>
          <label className="text-sm text-gray-400">团队名称</label>
          <p className="font-medium">{tenant?.name}</p>
        </div>
        <div>
          <label className="text-sm text-gray-400">邮箱</label>
          <p className="font-medium">{user?.email}</p>
        </div>
        <div>
          <label className="text-sm text-gray-400">角色</label>
          <p className="font-medium">{user?.role}</p>
        </div>
        <div>
          <label className="text-sm text-gray-400">注册时间</label>
          <p className="font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("zh-CN") : "-"}</p>
        </div>
      </div>
    </motion.div>
  );
}
