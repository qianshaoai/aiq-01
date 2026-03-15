"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from "lucide-react";

type Status = "loading" | "valid" | "invalid" | "done";

function InvitePage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [status, setStatus] = useState<Status>("loading");
  const [inviteInfo, setInviteInfo] = useState<{ enterpriseName: string } | null>(null);
  const [form, setForm] = useState({ name: "", loginAccount: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    fetch(`/api/auth/invite?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStatus("invalid");
          setError(data.error);
        } else {
          setInviteInfo(data);
          setStatus("valid");
        }
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "操作失败");
        return;
      }
      setStatus("done");
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (status === "invalid") {
    return (
      <Card className="shadow-sm">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <div>
            <p className="font-semibold">邀请链接无效</p>
            <p className="text-sm text-muted-foreground mt-1">{error || "该邀请链接已失效或已过期"}</p>
          </div>
          <p className="text-sm text-muted-foreground">请联系管理员重新发送邀请链接</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "done") {
    return (
      <Card className="shadow-sm">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <div>
            <p className="font-semibold">账号创建成功</p>
            <p className="text-sm text-muted-foreground mt-1">你已加入 {inviteInfo?.enterpriseName}</p>
          </div>
          <Link href="/login" className="block w-full text-center px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors">前往登录</Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">接受邀请</CardTitle>
        <CardDescription>
          你已被邀请加入 <span className="font-medium text-foreground">{inviteInfo?.enterpriseName}</span>，请设置账号信息
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={submitting}>
            {submitting ? "提交中..." : "确认加入"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function InvitePageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <InvitePage />
    </Suspense>
  );
}
