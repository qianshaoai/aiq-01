"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ loginAccount: "", password: "", enterpriseCode: "" });
  const [error, setError] = useState("");

  const errorParam = params.get("error");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "登录失败");
        return;
      }

      if (data.mustChangePassword) {
        window.location.href = "/change-password?first=1";
      } else {
        window.location.href = "/tasks";
      }
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">登录</CardTitle>
        <CardDescription>使用企业账号登录工作台</CardDescription>
      </CardHeader>
      <CardContent>
        {errorParam === "account_inactive" && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>账号已停用或锁定，请联系企业管理员</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="enterpriseCode">企业码</Label>
            <Input
              id="enterpriseCode"
              placeholder="请输入企业码"
              value={form.enterpriseCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, enterpriseCode: e.target.value })}
              required
              autoComplete="organization"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="loginAccount">账号</Label>
            <Input
              id="loginAccount"
              placeholder="请输入账号"
              value={form.loginAccount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, loginAccount: e.target.value })}
              required
              autoComplete="username"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="请输入密码"
                value={form.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground space-y-2">
          <p>
            没有账号？{" "}
            <Link href="/register" className="text-primary hover:underline">
              用企业码注册
            </Link>
          </p>
          <p className="text-xs">忘记密码？请联系企业管理员重置</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPageWrapper() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
