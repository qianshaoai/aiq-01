import { NextRequest, NextResponse } from "next/server";
import { getSuperSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";

function generateEnterpriseCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function GET(_req: NextRequest) {
  const session = await getSuperSession();
  if (!session) return apiUnauthorized();

  const enterprises = await prisma.enterprise.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      enterpriseCode: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { users: true, teams: true } },
    },
  });

  return NextResponse.json({ enterprises });
}

export async function POST(req: NextRequest) {
  const session = await getSuperSession();
  if (!session) return apiUnauthorized();

  const { name } = await req.json();
  if (!name?.trim()) return apiError("请填写企业名称");

  // Generate unique enterprise code
  let enterpriseCode: string;
  let attempts = 0;
  do {
    enterpriseCode = generateEnterpriseCode();
    const existing = await prisma.enterprise.findFirst({ where: { enterpriseCode } });
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  const enterprise = await prisma.enterprise.create({
    data: {
      name: name.trim(),
      enterpriseCode,
    },
  });

  return NextResponse.json({ enterprise }, { status: 201 });
}
