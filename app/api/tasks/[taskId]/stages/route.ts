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

  const stage = await prisma.taskStageRecord.create({
    data: { taskId, stageType, summary: summary ?? null, content: content ?? null, status: status ?? "PENDING" },
  });

  // 同步更新任务状态
  if (taskStatus) {
    await prisma.task.update({ where: { id: taskId }, data: { status: taskStatus, currentStage: stageType } });
  }

  return NextResponse.json({ stage });
}
