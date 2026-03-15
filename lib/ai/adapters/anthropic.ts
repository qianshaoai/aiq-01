import Anthropic from "@anthropic-ai/sdk";
import type { Message, AIProviderSettings } from "../types";

export async function* anthropicStream(
  messages: Message[],
  systemPrompt: string,
  settings: AIProviderSettings
): AsyncIterable<string> {
  const client = new Anthropic({
    apiKey: settings.apiKey,
    baseURL: settings.baseUrl || undefined,
  });

  const stream = client.messages.stream({
    model: settings.modelName || "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      yield chunk.delta.text;
    }
  }
}
