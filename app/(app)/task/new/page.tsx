import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { TaskNewShell } from "@/components/task/task-new-shell";

export default async function TaskNewPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status !== "ACTIVE") redirect("/?error=inactive");

  return (
    <Suspense>
      <TaskNewShell userId={user.id} enterpriseId={user.enterpriseId} />
    </Suspense>
  );
}
