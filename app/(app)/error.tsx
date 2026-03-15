"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-96 py-16">
      <div className="text-center max-w-sm px-6">
        <p className="text-3xl font-bold text-destructive mb-3">出错了</p>
        <p className="text-sm text-muted-foreground mb-6">
          {error.message || "页面加载失败，请尝试刷新或返回首页。"}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            重试
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
