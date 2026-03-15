"use client";

import { useEffect } from "react";

export default function RootError({
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center max-w-sm px-6">
        <p className="text-4xl font-bold text-destructive mb-4">出错了</p>
        <h1 className="text-lg font-semibold text-foreground mb-2">应用发生了错误</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {error.message || "发生了未知错误，请稍后再试。"}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            重试
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors"
          >
            回到首页
          </a>
        </div>
      </div>
    </div>
  );
}
