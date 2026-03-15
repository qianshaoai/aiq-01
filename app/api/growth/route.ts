import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiUnauthorized } from "@/lib/errors";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = 10;

  const [receipts, total, aiqRecords] = await Promise.all([
    prisma.growthReceipt.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { task: { select: { id: true, title: true, taskType: true } } },
    }),
    prisma.growthReceipt.count({ where: { userId: session.userId } }),
    prisma.aIQRecord.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        dimensionKey: true,
        levelTag: true,
        explanation: true,
        createdAt: true,
        task: { select: { id: true, title: true } },
      },
    }),
  ]);

  // Aggregate AIQ by dimension (latest 10 tasks)
  const dimensionSummary: Record<string, { improve: number; stable: number; weak: number }> = {};
  for (const r of aiqRecords) {
    if (!dimensionSummary[r.dimensionKey]) {
      dimensionSummary[r.dimensionKey] = { improve: 0, stable: 0, weak: 0 };
    }
    if (r.levelTag === "有提升") dimensionSummary[r.dimensionKey].improve++;
    else if (r.levelTag === "表现稳定") dimensionSummary[r.dimensionKey].stable++;
    else dimensionSummary[r.dimensionKey].weak++;
  }

  return NextResponse.json({ receipts, total, aiqRecords, dimensionSummary });
}
