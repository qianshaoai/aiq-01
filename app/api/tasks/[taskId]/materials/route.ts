import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";

type Params = { params: Promise<{ taskId: string }> };

// POST — 添加文字资料
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const { taskId } = await params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, creatorUserId: session.userId },
  });
  if (!task) return apiError("任务不存在", 404);

  const { materialType, content, fileName } = await req.json();

  const material = await prisma.taskMaterial.create({
    data: {
      taskId,
      materialType: materialType ?? "TEXT",
      fileName: fileName ?? null,
      contentExtracted: content ?? null,
      parseStatus: "SUCCESS",
    },
  });

  return NextResponse.json({ material });
}

// DELETE — 删除资料
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const { taskId } = await params;
  const { materialId } = await req.json();

  const task = await prisma.task.findFirst({
    where: { id: taskId, creatorUserId: session.userId },
  });
  if (!task) return apiError("任务不存在", 404);

  await prisma.taskMaterial.deleteMany({
    where: { id: materialId, taskId },
  });

  return NextResponse.json({ ok: true });
}
