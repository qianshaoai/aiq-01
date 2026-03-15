import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { TaskHistoryShell } from "@/components/task/task-history-shell";

export default async function TasksPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <Suspense>
      <TaskHistoryShell />
    </Suspense>
  );
}
