export default function WorkspaceLoading() {
  return (
    <div className="flex items-center justify-center h-full min-h-64 py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">正在加载工作区...</p>
      </div>
    </div>
  );
}
