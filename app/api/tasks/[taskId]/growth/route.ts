import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/lib/ai/gateway";
import { apiError, apiUnauthorized } from "@/lib/errors";

type Params = { params: Promise<{ taskId: string }> };

const GROWTH_SYSTEM_PROMPT = `你是一位专业的职场成长教练，擅长从任务执行过程中提炼成长洞察。
请根据用户提供的任务信息，生成一份简洁有力的成长回执，同时对用户六个 AIQ 维度进行评估。

AIQ 六维说明：
- expression（表达力）：与 AI 协作时的指令清晰度和表达能力
- judgment（判断力）：对方向、建议的判断和取舍能力
- structure（结构力）：任务分解、框架搭建能力
- execution（执行力）：推进任务、落实行动的能力
- integration（整合力）：综合信息、整合资源的能力
- reflection（复盘力）：总结经验、提炼规律的能力

levelTag 只能取以下三个值之一：有提升 / 表现稳定 / 仍可加强

仅返回合法 JSON，不包含任何 Markdown 代码块、注释或其他内容：
{
  "summaryOfCompletion": "本次任务完成情况的客观总结，2~3 句话",
  "strengthSummary": "用户在此任务中展现的优势能力，具体且有说服力，1~2 句话",
  "weaknessSummary": "本次任务中可以提升的方向，建设性而非批评性，1~2 句话",
  "nextActionSuggestion": "基于本次任务的下一步成长建议，可执行、具体，1~2 句话",
  "aiqEvaluation": [
    { "dimensionKey": "expression", "levelTag": "有提升", "explanation": "简短说明，不超过30字" },
    { "dimensionKey": "judgment", "levelTag": "表现稳定", "explanation": "简短说明，不超过30字" },
    { "dimensionKey": "structure", "levelTag": "仍可加强", "explanation": "简短说明，不超过30字" },
    { "dimensionKey": "execution", "levelTag": "有提升", "explanation": "简短说明，不超过30字" },
    { "dimensionKey": "integration", "levelTag": "表现稳定", "explanation": "简短说明，不超过30字" },
    { "dimensionKey": "reflection", "levelTag": "仍可加强", "explanation": "简短说明，不超过30字" }
  ]
}`;

interface AIQEvalItem {
  dimensionKey: string;
  levelTag: string;
  explanation?: string;
}

interface GrowthJSON {
  summaryOfCompletion?: string;
  strengthSummary?: string;
  weaknessSummary?: string;
  nextActionSuggestion?: string;
  aiqEvaluation?: AIQEvalItem[];
}

function extractJSON(raw: string): GrowthJSON {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned) as GrowthJSON;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as GrowthJSON; } catch { /* ignore */ }
    }
    throw new Error("AI 返回内容无法解析为 JSON");
  }
}

const VALID_DIMENSIONS = new Set(["expression", "judgment", "structure", "execution", "integration", "reflection"]);
const VALID_LEVELS = new Set(["有提升", "表现稳定", "仍可加强"]);

// POST /api/tasks/[taskId]/growth — 生成并保存成长回执
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const { taskId } = await params;

  // 幂等：已有回执则直接返回
  const existing = await prisma.growthReceipt.findFirst({
    where: { taskId, userId: session.userId },
  });
  if (existing) return NextResponse.json({ receipt: existing });

  const [task, latestResult] = await Promise.all([
    prisma.task.findFirst({
      where: { id: taskId, creatorUserId: session.userId },
    }),
    prisma.taskResult.findFirst({
      where: { taskId },
      orderBy: { versionNo: "desc" },
      select: { summary: true, content: true },
    }),
  ]);
  if (!task) return apiError("任务不存在", 404);

  const userMessage = [
    `任务类型：${task.taskType}`,
    `任务目标：${task.goal ?? "（未填写）"}`,
    task.outputType ? `期望产出：${task.outputType}` : "",
    task.completionCriteria ? `完成标准：${task.completionCriteria}` : "",
    latestResult?.summary
      ? `成果摘要：${latestResult.summary}`
      : latestResult?.content
        ? `成果节选：${latestResult.content.slice(0, 800)}`
        : "（暂无成果内容）",
  ].filter(Boolean).join("\n");

  try {
    let fullContent = "";
    for await (const chunk of sendMessage(
      [{ role: "user", content: userMessage }],
      GROWTH_SYSTEM_PROMPT,
      session.enterpriseId
    )) {
      fullContent += chunk;
    }

    const parsed = extractJSON(fullContent);

    const validAiqItems = Array.isArray(parsed.aiqEvaluation)
      ? parsed.aiqEvaluation.filter(
          (item) => VALID_DIMENSIONS.has(item.dimensionKey) && VALID_LEVELS.has(item.levelTag)
        )
      : [];

    const receipt = await prisma.$transaction(async (tx) => {
      const created = await tx.growthReceipt.create({
        data: {
          taskId,
          userId: session.userId,
          summaryOfCompletion: parsed.summaryOfCompletion ?? null,
          strengthSummary: parsed.strengthSummary ?? null,
          weaknessSummary: parsed.weaknessSummary ?? null,
          nextActionSuggestion: parsed.nextActionSuggestion ?? null,
        },
      });
      if (validAiqItems.length > 0) {
        await tx.aIQRecord.createMany({
          data: validAiqItems.map((item) => ({
            userId: session.userId,
            taskId,
            dimensionKey: item.dimensionKey,
            levelTag: item.levelTag,
            explanation: item.explanation ?? null,
          })),
          skipDuplicates: true,
        });
      }
      return created;
    });

    return NextResponse.json({ receipt });
  } catch (err) {
    console.error("[growth POST]", err);
    return apiError("成长回执生成失败，请稍后重试", 500);
  }
}
