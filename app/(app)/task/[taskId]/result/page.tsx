import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResultShell } from "@/components/task/result-shell";

type Params = { params: Promise<{ taskId: string }> };

export default async function ResultPage({ params }: Params) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { taskId } = await params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, creatorUserId: user.id },
    include: {
      results: { orderBy: { versionNo: "desc" }, take: 1 },
      stageRecords: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!task) notFound();

  const latestResult = task.results[0] ?? null;

  return (
    <ResultShell
      task={{
        id: task.id,
        title: task.title,
        goal: task.goal,
        outputType: task.outputType,
        taskType: task.taskType,
        status: task.status,
        stageRecords: task.stageRecords.map((s) => ({
          stageType: s.stageType,
          summary: s.summary,
          createdAt: s.createdAt,
        })),
      }}
      result={latestResult}
    />
  );
}
