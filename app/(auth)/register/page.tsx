"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    loginAccount: "",
    password: "",
    enterpriseCode: "",
  });
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "注册失败");
        return;
      }

      setDone(true);
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Card className="shadow-sm">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground">注册成功</p>
            <p className="text-sm text-muted-foreground mt-1">
              你的账号已进入待激活状态，请等待团队负责人或企业管理员确认。
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              若 7 天内未确认，账号将自动锁定。
            </p>
          </div>
          <Link href="/login" className="block w-full text-center px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium transition-colors">
            返回登录
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">用企业码注册</CardTitle>
        <CardDescription>填写企业码完成账号注册</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="enterpriseCode">企业码</Label>
            <Input
              id="enterpriseCode"
              placeholder="请输入企业码"
              value={form.enterpriseCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, enterpriseCode: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              placeholder="请输入你的姓名"
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="loginAccount">登录账号</Label>
            <Input
              id="loginAccount"
              placeholder="自定义登录账号"
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
                placeholder="至少 8 位，含字母和数字"
                value={form.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="new-password"
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
            <p className="text-xs text-muted-foreground">密码至少 8 位，且必须包含字母和数字</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? "注册中..." : "注册"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          已有账号？{" "}
          <Link href="/login" className="text-primary hover:underline">
            直接登录
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
