import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { anthropicStream } from "./adapters/anthropic";
import { openaiStream } from "./adapters/openai";
import { geminiStream } from "./adapters/gemini";
import type { Message, AIProviderSettings, AgentKeyType } from "./types";

const TIMEOUT_MS = 60_000;

const OUTPUT_STYLE_SUFFIX: Record<string, string> = {
  FORMAL:   "\n\n请使用正式、专业的语气输出，避免口语化表达。",
  FRIENDLY: "\n\n请使用友好、平易近人的语气输出。",
  CONCISE:  "\n\n请尽量简洁，直接给出关键内容，避免冗余。",
};

export interface PromptVars {
  task_type?: string;
  company_name?: string;
  task_goal?: string;
  output_type?: string;
}

function interpolateVars(prompt: string, vars: PromptVars): string {
  return prompt
    .replace(/\{\{task_type\}\}/g, vars.task_type ?? "")
    .replace(/\{\{company_name\}\}/g, vars.company_name ?? "")
    .replace(/\{\{task_goal\}\}/g, vars.task_goal ?? "")
    .replace(/\{\{output_type\}\}/g, vars.output_type ?? "");
}

/**
 * 根据企业 ID + agentKey 构建系统提示词。
 * 查找顺序：企业专属配置 → 全局模板 → 传入的 fallback
 */
export async function buildAgentSystemPrompt(
  enterpriseId: string,
  agentKey: AgentKeyType,
  fallbackPrompt: string,
  vars?: PromptVars
): Promise<string> {
  // 1. 企业专属配置
  let agent = await prisma.agent.findFirst({
    where: { enterpriseId, agentKey, isEnabled: true },
  });

  // 2. 全局模板兜底
  if (!agent) {
    agent = await prisma.agent.findFirst({
      where: { enterpriseId: null, agentKey, isEnabled: true },
    });
  }

  if (!agent) return vars ? interpolateVars(fallbackPrompt, vars) : fallbackPrompt;

  let prompt = agent.systemPrompt?.trim() || fallbackPrompt;

  // 注入知识库（最多 8000 字）
  if (agent.knowledgeBase?.trim()) {
    const kb = agent.knowledgeBase.trim().slice(0, 8000);
    const truncated = agent.knowledgeBase.trim().length > 8000
      ? `${kb}\n（知识库内容已截断，请管理员精简）`
      : kb;
    prompt += `\n\n--- 企业知识库 ---\n${truncated}\n--- 知识库结束 ---`;
  }

  // 输出风格
  if (agent.outputStyle && OUTPUT_STYLE_SUFFIX[agent.outputStyle]) {
    prompt += OUTPUT_STYLE_SUFFIX[agent.outputStyle];
  }

  // 变量插值
  if (vars) prompt = interpolateVars(prompt, vars);

  return prompt;
}

export async function getActiveProviderSettings(
  enterpriseId: string
): Promise<AIProviderSettings> {
  const config = await prisma.aIProviderConfig.findFirst({
    where: { enterpriseId, isActive: true },
  });

  if (!config || !config.apiKeyEnc || !config.modelName) {
    throw new Error("AI 供应商未配置，请联系企业管理员在管理端配置 AI 供应商");
  }

  return {
    provider: config.provider,
    apiKey: decrypt(config.apiKeyEnc),
    modelName: config.modelName,
    baseUrl: config.baseUrl ?? undefined,
  };
}

export async function* sendMessage(
  messages: Message[],
  systemPrompt: string,
  enterpriseId: string
): AsyncIterable<string> {
  let settings = await getActiveProviderSettings(enterpriseId);

  const OPENAI_COMPAT_BASE_URLS: Partial<Record<typeof settings.provider, string>> = {
    DEEPSEEK: "https://api.deepseek.com/v1",
    DOUBAO:   "https://ark.volces.com/api/v3",
    QIANWEN:  "https://dashscope.aliyuncs.com/compatible-mode/v1",
    MINIMAX:  "https://api.minimax.chat/v1",
    KIMI:     "https://api.moonshot.cn/v1",
  };

  const defaultBase = OPENAI_COMPAT_BASE_URLS[settings.provider];
  if (defaultBase && !settings.baseUrl) {
    settings = { ...settings, baseUrl: defaultBase };
  }

  const streamFn = {
    ANTHROPIC: anthropicStream,
    OPENAI: openaiStream,
    GEMINI: geminiStream,
    DEEPSEEK: openaiStream,
    DOUBAO:   openaiStream,
    QIANWEN:  openaiStream,
    MINIMAX:  openaiStream,
    KIMI:     openaiStream,
  }[settings.provider];

  if (!streamFn) {
    throw new Error(`不支持的 AI 供应商：${settings.provider}`);
  }

  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; }, TIMEOUT_MS);

  try {
    for await (const chunk of streamFn(messages, systemPrompt, settings)) {
      if (timedOut) throw new Error("AI 处理超时，请稍后重试");
      yield chunk;
    }
  } finally {
    clearTimeout(timer);
  }
}

// 将 AsyncIterable<string> 转为 SSE ReadableStream（供 API Route 使用）
export function toSSEStream(iterable: AsyncIterable<string>): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of iterable) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI 处理出错";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
}
