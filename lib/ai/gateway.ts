import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { anthropicStream } from "./adapters/anthropic";
import { openaiStream } from "./adapters/openai";
import { geminiStream } from "./adapters/gemini";
import type { Message, AIProviderSettings } from "./types";

const TIMEOUT_MS = 60_000;

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
  const settings = await getActiveProviderSettings(enterpriseId);

  const streamFn = {
    ANTHROPIC: anthropicStream,
    OPENAI: openaiStream,
    GEMINI: geminiStream,
  }[settings.provider];

  if (!streamFn) {
    throw new Error(`不支持的 AI 供应商：${settings.provider}`);
  }

  // 超时包装
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
  }, TIMEOUT_MS);

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
