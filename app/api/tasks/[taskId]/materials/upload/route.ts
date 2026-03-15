import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiUnauthorized } from "@/lib/errors";

type Params = { params: Promise<{ taskId: string }> };

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const { taskId } = await params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, creatorUserId: session.userId },
  });
  if (!task) return apiError("任务不存在", 404);

  // 检查当前文件数量
  const count = await prisma.taskMaterial.count({ where: { taskId, materialType: "FILE" } });
  if (count >= 5) return apiError("单次任务最多上传 5 个文件");

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("请求格式错误");
  }

  const file = formData.get("file") as File | null;
  if (!file) return apiError("未找到文件");

  if (!ALLOWED_TYPES.includes(file.type)) {
    return apiError("文件格式不支持，仅支持 Word、PDF、PPT、TXT");
  }

  if (file.size > MAX_SIZE) {
    return apiError("文件超过 20MB 限制");
  }

  // 首版不做对象存储，仅读取文本内容（TXT 类型）
  let contentExtracted: string | null = null;
  if (file.type === "text/plain") {
    try {
      contentExtracted = await file.text();
    } catch {
      contentExtracted = null;
    }
  }

  const material = await prisma.taskMaterial.create({
    data: {
      taskId,
      materialType: "FILE",
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      parseStatus: contentExtracted ? "SUCCESS" : "PENDING",
      contentExtracted,
    },
  });

  return NextResponse.json({ material });
}
