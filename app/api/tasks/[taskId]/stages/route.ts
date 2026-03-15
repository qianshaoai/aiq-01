import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";

type Params = { params: Promise<{ taskId: string }> };

// POST — 创建/更新阶段记录
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const { taskId } = await params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, creatorUserId: session.userId },
  });
  if (!task) return apiError("任务不存在", 404);

  const { stageType, summary, content, status, taskStatus } = await req.json();
  if (!stageType) return apiError("缺少 stageType");

  // 在事务中同时写入阶段记录和更新任务状态，保证原子性
  const stage = await prisma.$transaction(async (tx) => {
    const created = await tx.taskStageRecord.create({
      data: { taskId, stageType, summary: summary ?? null, content: content ?? null, status: status ?? "PENDING" },
    });
    if (taskStatus) {
      await tx.task.update({ where: { id: taskId }, data: { status: taskStatus, currentStage: stageType } });
    }
    return created;
  });

  return NextResponse.json({ stage });
}
