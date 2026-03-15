import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkspaceShell } from "@/components/task/workspace-shell";

type Params = { params: Promise<{ taskId: string }> };

export default async function WorkspacePage({ params }: Params) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status !== "ACTIVE") redirect("/");

  const { taskId } = await params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, creatorUserId: user.id },
    include: {
      materials: { select: { id: true, materialType: true, fileName: true, contentExtracted: true, parseStatus: true } },
      stageRecords: { orderBy: { createdAt: "asc" } },
      results: { orderBy: { versionNo: "desc" }, take: 1 },
    },
  });

  if (!task) notFound();

  // 如果任务已完成，重定向到结果页
  if (task.status === "COMPLETED") {
    redirect(`/task/${taskId}/result`);
  }

  return (
    <WorkspaceShell
      task={{
        id: task.id,
        title: task.title,
        goal: task.goal,
        outputType: task.outputType,
        completionCriteria: task.completionCriteria,
        taskType: task.taskType,
        status: task.status,
        currentStage: task.currentStage,
        draftContent: task.draftContent,
        materials: task.materials,
        stageRecords: task.stageRecords,
        latestResult: task.results[0] ?? null,
      }}
      userId={user.id}
      enterpriseId={user.enterpriseId}
    />
  );
}
