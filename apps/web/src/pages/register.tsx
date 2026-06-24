import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useRegister } from "../hooks/use-auth.js";
import { AuthLayout } from "../components/layout/auth-layout.js";
import { Input, Field } from "../components/ui/field.js";
import { Button } from "../components/ui/button.js";
import { Icon } from "../components/ui/icon.js";

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
    <AuthLayout
      title="创建账号"
      subtitle="开始管理你的 MCP Server"
      footer={
        <>
          已有账号？
          <Link to="/auth/login" className="text-accent hover:underline ml-1">
            登录
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="工作区名称" required>
          <Input
            type="text"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            required
          />
        </Field>
        <Field label="邮箱" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>
        <Field label="密码" required hint="至少 8 位">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>

        {register.isError && (
          <p className="text-sm text-danger flex items-center gap-1.5">
            <Icon name="alert" className="w-4 h-4" />
            {(register.error as Error)?.message || "注册失败"}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          loading={register.isPending}
          className="w-full"
        >
          {register.isPending ? "创建中" : "创建账号"}
        </Button>
      </form>
    </AuthLayout>
  );
}
