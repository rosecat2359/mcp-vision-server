import { Link } from "react-router-dom";

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-6xl font-bold text-primary-600 mb-4">MCP Hub</h1>
      <p className="text-xl text-gray-600 mb-8 max-w-2xl">
        远程 MCP Server 部署与连接管理平台。
        注册、配置、监控你的 MCP Server，生成标准连接配置。
      </p>
      <div className="flex gap-4">
        <Link to="/auth/login" className="px-8 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-900 transition-colors">
          登录
        </Link>
        <Link to="/auth/register" className="px-8 py-3 border border-border-strong rounded-xl hover:bg-white/50 transition-colors">
          注册
        </Link>
      </div>
    </div>
  );
}
