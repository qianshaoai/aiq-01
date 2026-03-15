import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendMessage } from "@/lib/ai/gateway";
import { apiError, apiUnauthorized } from "@/lib/errors";

const STAGE_REVIEW_PROMPT = `你是一个 AI 协作教练，专注于在任务的关键断点为用户提供协作质量反馈。
请根据用户提供的本阶段对话摘要，生成一份简短的阶段协作回顾。
仅返回合法 JSON，不含任何其他内容：
{
  "infoCompleteness": "本阶段用户提供信息的完整度评价，一句话，不超过30字",
  "collaborationEfficiency": "协作效率评价（几轮对话、是否出现方向偏差），一句话，不超过30字",
  "techniqueTip": "一个具体的协作技巧提示，可执行，不超过40字"
}`;

interface StageReviewJSON {
  infoCompleteness?: string;
  collaborationEfficiency?: string;
  techniqueTip?: string;
}

function extractJSON(raw: string): StageReviewJSON {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned) as StageReviewJSON;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as StageReviewJSON; } catch { /* ignore */ }
    }
    return {};
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  let body: { stageType?: string; messageCount?: number; taskGoal?: string };
  try {
    body = await req.json();
  } catch {
    return apiError("请求格式错误");
  }

  const { stageType = "DIRECTION", messageCount = 0, taskGoal = "" } = body;

  const userMessage = [
    `断点类型：${stageType === "DIRECTION" ? "方向确认" : "初稿确认"}`,
    `本阶段对话轮数：${messageCount} 轮`,
    taskGoal ? `任务目标：${taskGoal}` : "",
  ].filter(Boolean).join("\n");

  try {
    let fullContent = "";
    for await (const chunk of sendMessage(
      [{ role: "user", content: userMessage }],
      STAGE_REVIEW_PROMPT,
      session.enterpriseId
    )) {
      fullContent += chunk;
    }

    const parsed = extractJSON(fullContent);
    return NextResponse.json({
      infoCompleteness: parsed.infoCompleteness ?? "信息基本完整",
      collaborationEfficiency: parsed.collaborationEfficiency ?? "协作顺畅",
      techniqueTip: parsed.techniqueTip ?? "下次可以在开始时提供更具体的完成标准",
    });
  } catch (err) {
    console.error("[ai/stage-review POST]", err);
    return apiError("阶段回顾生成失败", 500);
  }
}
