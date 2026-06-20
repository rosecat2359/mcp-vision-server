import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLogin } from "../hooks/use-auth.js";
import { pageTransition, pageTransitionConfig } from "../lib/motion.js";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
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
        <h1 className="text-2xl font-bold text-primary-600 mb-2">登录 MCP Hub</h1>
        <p className="text-gray-500 mb-6">管理你的 MCP Server</p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="block text-sm font-medium mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-border-default rounded-xl focus:border-border-focus outline-none bg-white/60"
              required
            />
          </div>

          {login.isError && (
            <p className="text-danger text-sm">
              {(login.error as Error)?.message || "登录失败"}
            </p>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-900 transition-colors disabled:opacity-50"
          >
            {login.isPending ? "登录中..." : "登录"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          还没有账号？<Link to="/auth/register" className="text-primary-600 hover:underline">注册</Link>
        </p>
      </div>
    </motion.div>
  );
}
