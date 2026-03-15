import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";

// GET /api/tasks — 任务列表（含筛选）
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const status = req.nextUrl.searchParams.get("status");
  const taskType = req.nextUrl.searchParams.get("type");
  const sourceType = req.nextUrl.searchParams.get("sourceType");
  const search = req.nextUrl.searchParams.get("q");
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = 20;

  const where: Record<string, unknown> = {
    creatorUserId: session.userId,
  };

  // 指定 status 时精确过滤；否则排除回收站
  if (status) {
    where.status = status;
  } else {
    where.status = { not: "IN_RECYCLE_BIN" };
  }
  if (taskType) where.taskType = taskType;
  if (sourceType) where.sourceType = sourceType;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
      { goal: { contains: search, mode: "insensitive" } },
    ];
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [
        // 未完成优先
        { status: "asc" },
        { updatedAt: "desc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        summary: true,
        taskType: true,
        status: true,
        sourceType: true,
        updatedAt: true,
        createdAt: true,
      },
    }),
    prisma.task.count({ where }),
  ]);

  return NextResponse.json({ tasks, total, page, pageSize });
}

// POST /api/tasks — 创建任务
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  if (session.status !== "ACTIVE") return apiError("账号未激活", 403);

  const { taskType, sourceType, title, summary, goal, outputType, completionCriteria } =
    await req.json();

  if (!taskType) return apiError("请选择任务类型");

  // 先查用户 teamId，在事务中一次性创建任务（避免两次写入不一致）
  const creator = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { teamId: true },
  });

  const task = await prisma.task.create({
    data: {
      enterpriseId: session.enterpriseId,
      teamId: creator?.teamId ?? null,
      creatorUserId: session.userId,
      taskType,
      sourceType: sourceType ?? "WAR",
      title: title ?? null,
      summary: summary ?? null,
      goal: goal ?? null,
      outputType: outputType ?? null,
      completionCriteria: completionCriteria ?? null,
      status: "CREATED",
    },
  });

  return NextResponse.json({ task });
}
