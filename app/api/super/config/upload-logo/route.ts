import { NextRequest, NextResponse } from "next/server";
import { getSuperSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";

export async function POST(req: NextRequest) {
  const session = await getSuperSession();
  if (!session) return apiUnauthorized();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("请求格式错误");
  }

  const file = formData.get("file") as File | null;
  if (!file) return apiError("未上传文件");

  const filename = file.name.toLowerCase();
  if (!filename.endsWith(".svg") && !filename.endsWith(".png")) {
    return apiError("仅支持 SVG 或 PNG 格式");
  }

  if (file.size > 500 * 1024) return apiError("文件不能超过 500KB");

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mimeType = filename.endsWith(".svg") ? "image/svg+xml" : "image/png";
  const dataUrl = `data:${mimeType};base64,${base64}`;

  await prisma.platformConfig.upsert({
    where: { key: "platform_logo_url" },
    create: { key: "platform_logo_url", value: dataUrl, updatedBy: session.superAdminId },
    update: { value: dataUrl, updatedBy: session.superAdminId },
  });

  return NextResponse.json({ logoUrl: dataUrl });
}
