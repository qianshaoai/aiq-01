import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TaskDetailShell } from "@/components/task/task-detail-shell";

type Params = { params: Promise<{ taskId: string }> };

export default async function TaskDetailPage({ params }: Params) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { taskId } = await params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, creatorUserId: user.id },
    include: {
      stageRecords: { orderBy: { createdAt: "asc" } },
      results: { orderBy: { versionNo: "desc" }, take: 1 },
      materials: { select: { id: true, materialType: true, fileName: true, parseStatus: true } },
    },
  });

  if (!task) notFound();

  return (
    <TaskDetailShell
      task={{
        id: task.id,
        title: task.title,
        goal: task.goal,
        outputType: task.outputType,
        completionCriteria: task.completionCriteria,
        taskType: task.taskType,
        status: task.status,
        currentStage: task.currentStage,
        updatedAt: task.updatedAt,
        createdAt: task.createdAt,
        materials: task.materials,
        stageRecords: task.stageRecords.map((s) => ({
          stageType: s.stageType,
          summary: s.summary,
          status: s.status,
          createdAt: s.createdAt,
        })),
        latestResult: task.results[0] ? {
          id: task.results[0].id,
          summary: task.results[0].summary,
          content: task.results[0].content,
        } : null,
      }}
    />
  );
}
