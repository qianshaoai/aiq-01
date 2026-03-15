import { GoogleGenAI } from "@google/genai";
import type { Message, AIProviderSettings } from "../types";

export async function* geminiStream(
  messages: Message[],
  systemPrompt: string,
  settings: AIProviderSettings
): AsyncIterable<string> {
  const ai = new GoogleGenAI({ apiKey: settings.apiKey });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  const response = await ai.models.generateContentStream({
    model: settings.modelName || "gemini-2.0-flash",
    config: { systemInstruction: systemPrompt },
    contents: [
      ...history,
      { role: "user", parts: [{ text: lastMessage?.content ?? "" }] },
    ],
  });

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) yield text;
  }
}
