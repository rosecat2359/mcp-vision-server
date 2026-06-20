import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useRegister } from "../hooks/use-auth.js";
import { pageTransition, pageTransitionConfig } from "../lib/motion.js";

export function Register() {
  const [tenantName, setTenantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const register = useRegister();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    register.mutate({ name: "", email, password, tenantName });
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center p-8"
      variants={pageTransition}
      initial="initial"
      animate="animate"
      transition={pageTransitionConfig}
    >
      <div className="w-full max-w-md bg-white/88 backdrop-blur-xl rounded-2xl border border-border-default p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-primary-600 mb-2">创建账号</h1>
        <p className="text-gray-500 mb-6">开始管理你的 MCP Server</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">团队名称</label>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              className="w-full px-4 py-2 border border-border-default rounded-xl focus:border-border-focus outline-none bg-white/60"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-border-default rounded-xl focus:border-border-focus outline-none bg-white/60"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密码 (至少 8 位)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-border-default rounded-xl focus:border-border-focus outline-none bg-white/60"
              required
              minLength={8}
            />
          </div>

          {register.isError && (
            <p className="text-danger text-sm">
              {(register.error as Error)?.message || "注册失败"}
            </p>
          )}

          <button
            type="submit"
            disabled={register.isPending}
            className="w-full py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-900 transition-colors disabled:opacity-50"
          >
            {register.isPending ? "创建中..." : "创建账号"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          已有账号？<Link to="/auth/login" className="text-primary-600 hover:underline">登录</Link>
        </p>
      </div>
    </motion.div>
  );
}
