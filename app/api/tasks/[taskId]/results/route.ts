import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";

type Params = { params: Promise<{ taskId: string }> };

// POST — 保存任务结果
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const { taskId } = await params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, creatorUserId: session.userId },
  });
  if (!task) return apiError("任务不存在", 404);

  const { title, summary, content, resultType, status } = await req.json();

  // 获取当前最大版本号
  const latest = await prisma.taskResult.findFirst({
    where: { taskId },
    orderBy: { versionNo: "desc" },
    select: { versionNo: true },
  });

  const result = await prisma.taskResult.create({
    data: {
      taskId,
      versionNo: (latest?.versionNo ?? 0) + 1,
      title: title ?? null,
      summary: summary ?? null,
      content: content ?? null,
      resultType: resultType ?? null,
      status: status ?? "DRAFT",
    },
  });

  // 更新任务的 latestResultId
  await prisma.task.update({
    where: { id: taskId },
    data: { latestResultId: result.id },
  });

  return NextResponse.json({ result });
}
