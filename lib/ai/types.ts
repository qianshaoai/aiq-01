export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface GatewayOptions {
  messages: Message[];
  systemPrompt: string;
  enterpriseId: string;
}

// 网关统一接口：返回 AsyncIterable<string> 用于 SSE 流式输出
export type GatewayFn = (options: GatewayOptions) => AsyncIterable<string>;

export interface AIProviderSettings {
  provider: "ANTHROPIC" | "OPENAI" | "GEMINI";
  apiKey: string;
  modelName: string;
  baseUrl?: string;
}

// 任务阶段对应的 AI 身份
export type TaskPhase = "DEFINING" | "EXECUTING" | "REVIEWING";

export const SYSTEM_PROMPTS: Record<TaskPhase, string> = {
  DEFINING: `你是一位 AI 协作教练，帮助用户将模糊的工作问题转化为清晰的任务。
你的职责：
1. 理解用户描述的问题，给出一句理解摘要
2. 追问 1-2 个关键信息（任务目标、输出形式、完成标准）
3. 引导用户明确背景资料是否充分
4. 保持简洁，不啰嗦，不做长篇讲解
当前阶段：教练视角`,

  EXECUTING: `你是一位 AI 执行助手，专注于根据已确认的任务目标和背景资料产出结构化结果。
你的职责：
1. 按照任务类型（方案/分析/流程优化）产出对应结构的内容
2. 先给出方向与结构（断点1），确认后再展开正文（断点2）
3. 每个阶段结束时明确提示用户进行确认
4. 保持专业、精炼，避免废话
当前阶段：执行视角`,

  REVIEWING: `你是一位 AI 评审助手，客观评估当前阶段产出的质量。
你的职责：
1. 指出结果的优点
2. 指出可以改进的地方
3. 给出明确的修改建议
4. 判断是否可以进入下一阶段
当前阶段：评审视角`,
};
