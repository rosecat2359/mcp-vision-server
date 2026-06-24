import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useLogin } from "../hooks/use-auth.js";
import { AuthLayout } from "../components/layout/auth-layout.js";
import { Input, Field } from "../components/ui/field.js";
import { Button } from "../components/ui/button.js";
import { Icon } from "../components/ui/icon.js";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <AuthLayout
      title="登录"
      subtitle="管理你的 MCP Server"
      footer={
        <>
          还没有账号？
          <Link to="/auth/register" className="text-accent hover:underline ml-1">
            注册
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="邮箱" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>
        <Field label="密码" required>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </Field>

        {login.isError && (
          <p className="text-sm text-danger flex items-center gap-1.5">
            <Icon name="alert" className="w-4 h-4" />
            {(login.error as Error)?.message || "登录失败"}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          loading={login.isPending}
          className="w-full"
        >
          {login.isPending ? "登录中" : "登录"}
        </Button>
      </form>
    </AuthLayout>
  );
}
