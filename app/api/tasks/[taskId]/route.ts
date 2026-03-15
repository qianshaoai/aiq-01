import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";

type Params = { params: Promise<{ taskId: string }> };

// GET /api/tasks/[taskId]
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const { taskId } = await params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, creatorUserId: session.userId },
    include: {
      materials: true,
      stageRecords: { orderBy: { createdAt: "asc" } },
      results: { orderBy: { versionNo: "desc" }, take: 1 },
    },
  });

  if (!task) return apiError("任务不存在", 404);
  return NextResponse.json({ task });
}

// PATCH /api/tasks/[taskId]
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const { taskId } = await params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, creatorUserId: session.userId },
  });
  if (!task) return apiError("任务不存在", 404);

  const body = await req.json();
  const {
    title, summary, goal, outputType, completionCriteria,
    status, currentStage, draftContent,
  } = body;

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (summary !== undefined) updateData.summary = summary;
  if (goal !== undefined) updateData.goal = goal;
  if (outputType !== undefined) updateData.outputType = outputType;
  if (completionCriteria !== undefined) updateData.completionCriteria = completionCriteria;
  if (status !== undefined) updateData.status = status;
  if (currentStage !== undefined) updateData.currentStage = currentStage;
  if (draftContent !== undefined) {
    updateData.draftContent = draftContent;
    updateData.draftSavedAt = new Date();
  }
  if (status === "ARCHIVED") updateData.archivedAt = new Date();

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
  });

  return NextResponse.json({ task: updated });
}
