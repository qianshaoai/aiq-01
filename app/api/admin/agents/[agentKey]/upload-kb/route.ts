import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiUnauthorized } from "@/lib/errors";

type Params = { params: Promise<{ agentKey: string }> };

export async function POST(req: NextRequest, { params: _params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "ENTERPRISE_ADMIN") return apiUnauthorized();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("请求格式错误");
  }

  const file = formData.get("file") as File | null;
  if (!file) return apiError("未上传文件");

  const filename = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let text = "";

    if (filename.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else if (filename.endsWith(".pdf")) {
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = (pdfParseModule as unknown as { default: (buf: Buffer) => Promise<{ text: string }> }).default ?? pdfParseModule;
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (filename.endsWith(".docx") || filename.endsWith(".doc")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return apiError("仅支持 TXT、PDF、Word（.doc/.docx）格式");
    }

    // Clean up whitespace
    text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

    return NextResponse.json({ text, charCount: text.length });
  } catch (err) {
    console.error("[upload-kb]", err);
    return apiError("文件解析失败，请确认文件格式正确");
  }
}
