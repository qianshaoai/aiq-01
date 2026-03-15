export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
            <span className="text-white text-xl font-bold">前</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">前哨 AI 进化场</h1>
          <p className="text-sm text-muted-foreground mt-1">企业 AI 协作工作台</p>
        </div>
        {children}
      </div>
    </div>
  );
}
