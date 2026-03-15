import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center max-w-sm px-6">
        <p className="text-6xl font-bold text-primary mb-4">404</p>
        <h1 className="text-lg font-semibold text-foreground mb-2">页面不存在</h1>
        <p className="text-sm text-muted-foreground mb-6">
          你访问的页面不存在或已被移除。
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          回到首页
        </Link>
      </div>
    </div>
  );
}
