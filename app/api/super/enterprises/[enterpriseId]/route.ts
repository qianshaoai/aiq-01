import { NextRequest, NextResponse } from "next/server";
import { getSuperSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";

type Params = { params: Promise<{ enterpriseId: string }> };

function generateEnterpriseCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSuperSession();
  if (!session) return apiUnauthorized();

  const { enterpriseId } = await params;

  const enterprise = await prisma.enterprise.findUnique({
    where: { id: enterpriseId },
    include: {
      teams: {
        select: {
          id: true,
          name: true,
          status: true,
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { users: true, teams: true } },
    },
  });
  if (!enterprise) return apiError("企业不存在", 404);

  // Task stats
  const [taskTotal, taskCompleted] = await Promise.all([
    prisma.task.count({ where: { creator: { enterpriseId } } }),
    prisma.task.count({ where: { creator: { enterpriseId }, status: "COMPLETED" } }),
  ]);

  return NextResponse.json({ enterprise, taskTotal, taskCompleted });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSuperSession();
  if (!session) return apiUnauthorized();

  const { enterpriseId } = await params;
  const { action } = await req.json();

  if (!["enable", "disable", "reset_code"].includes(action)) {
    return apiError("无效操作");
  }

  const enterprise = await prisma.enterprise.findUnique({ where: { id: enterpriseId } });
  if (!enterprise) return apiError("企业不存在", 404);

  if (action === "reset_code") {
    let newCode = generateEnterpriseCode();
    // ensure uniqueness
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.enterprise.findUnique({ where: { enterpriseCode: newCode } });
      if (!existing) break;
      newCode = generateEnterpriseCode();
      attempts++;
    }
    const updated = await prisma.enterprise.update({
      where: { id: enterpriseId },
      data: { enterpriseCode: newCode },
    });
    return NextResponse.json({ enterprise: updated });
  }

  const updated = await prisma.enterprise.update({
    where: { id: enterpriseId },
    data: { status: action === "disable" ? "DISABLED" : "ACTIVE" },
  });

  return NextResponse.json({ enterprise: updated });
}
