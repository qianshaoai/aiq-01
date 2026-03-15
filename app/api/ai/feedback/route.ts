import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendMessage } from "@/lib/ai/gateway";
import { apiError, apiUnauthorized } from "@/lib/errors";

const FEEDBACK_SYSTEM_PROMPT = `你是一个 AI 协作教练，专注于帮助用户提升与 AI 协作的表达质量。
请对用户刚才的输入做简短评价。
仅返回合法 JSON，不含任何其他内容：
{
  "stars": 表达清晰度评分，1到5的整数，
  "strength": "做得好的地方，一句话，不超过25字",
  "suggestion": "一个具体的改进建议，一句话，不超过25字",
  "tags": ["2到3个标签，如：指令明确、善用背景、需补充目标、结构清晰、需细化标准"]
}`;

interface FeedbackJSON {
  stars?: number;
  strength?: string;
  suggestion?: string;
  tags?: string[];
}

function extractJSON(raw: string): FeedbackJSON {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned) as FeedbackJSON;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as FeedbackJSON; } catch { /* ignore */ }
    }
    return {};
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return apiError("请求格式错误");
  }

  const { message } = body;
  if (!message?.trim()) return apiError("消息内容不能为空");

  try {
    let fullContent = "";
    for await (const chunk of sendMessage(
      [{ role: "user", content: message }],
      FEEDBACK_SYSTEM_PROMPT,
      session.enterpriseId
    )) {
      fullContent += chunk;
    }

    const parsed = extractJSON(fullContent);
    return NextResponse.json({
      stars: Math.min(5, Math.max(1, parsed.stars ?? 3)),
      strength: parsed.strength ?? "表达较清晰",
      suggestion: parsed.suggestion ?? "可以进一步明确目标",
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 3) : [],
    });
  } catch (err) {
    console.error("[ai/feedback POST]", err);
    return apiError("反馈生成失败", 500);
  }
}
