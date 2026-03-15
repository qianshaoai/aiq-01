import OpenAI from "openai";
import type { Message, AIProviderSettings } from "../types";

export async function* openaiStream(
  messages: Message[],
  systemPrompt: string,
  settings: AIProviderSettings
): AsyncIterable<string> {
  const client = new OpenAI({
    apiKey: settings.apiKey,
    baseURL: settings.baseUrl || undefined,
  });

  const stream = await client.chat.completions.create({
    model: settings.modelName || "gpt-4o",
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
