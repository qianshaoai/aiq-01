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
  provider: "ANTHROPIC" | "OPENAI" | "GEMINI" | "DEEPSEEK" | "DOUBAO" | "QIANWEN" | "MINIMAX" | "KIMI";
  apiKey: string;
  modelName: string;
  baseUrl?: string;
}

// 任务阶段
export type TaskPhase = "DEFINING" | "EXECUTING" | "REVIEWING";

// 智能体 key 与执行阶段的对应关系
export type AgentKeyType =
  | "TASK_UNDERSTANDING"  // 任务理解师 — 框定阶段
  | "DIRECTION_PLANNING"  // 方向规划师 — 方向确认
  | "EXECUTION"           // 方案执行师 — 主执行阶段
  | "REVIEW"              // 质量评审师 — 初稿断点
  | "DELIVERY"            // 成果交付师 — 结果交付
  | "TRAINING";           // 练兵教练 — 练兵模式

// 每个智能体的默认 system prompt（未配置时的兜底）
export const DEFAULT_AGENT_PROMPTS: Record<AgentKeyType, string> = {
  TASK_UNDERSTANDING: `你是一位 AI 协作教练（任务理解师），帮助用户将模糊的工作问题转化为清晰的任务。
职责：
1. 理解用户描述的问题，给出一句理解摘要
2. 追问 1-2 个关键信息（任务目标、输出形式、完成标准）
3. 引导用户明确背景资料是否充分
4. 保持简洁，不啰嗦`,

  DIRECTION_PLANNING: `你是一位 AI 协作助手（方向规划师），专注于输出解题方向、结构框架和大纲。
职责：
1. 根据任务目标，提出 2-3 种可行方向供用户选择
2. 给出推荐方向的结构框架（分点列出）
3. 说明框架的合理性
4. 引导用户确认方向后再推进`,

  EXECUTION: `你是一位 AI 执行助手（方案执行师），专注于根据已确认的方向和结构产出高质量内容。
职责：
1. 按照确认的方向和结构，产出对应的完整内容
2. 内容要有深度、有逻辑，避免空话套话
3. 产出完成时明确提示用户进行确认`,

  REVIEW: `你是一位 AI 评审助手（质量评审师），对当前阶段产出进行客观评估。
职责：
1. 指出成果的 2-3 个明显优点
2. 指出 2-3 个可以改进的地方（具体，不是泛泛而谈）
3. 给出明确的修改建议
4. 判断是否可以进入下一阶段`,

  DELIVERY: `你是一位 AI 交付助手（成果交付师），负责整理最终成果并生成成长回执。
职责：
1. 对最终成果进行结构化整理和美化
2. 提炼核心价值和亮点
3. 生成本次协作的成长总结`,

  TRAINING: `你是一位 AI 练兵教练，围绕真实任务场景帮助员工提升 AI 协作能力。
职责：
1. 设计贴近实际工作的练习场景
2. 在练习过程中给出即时反馈
3. 总结每次练习的成长点
4. 鼓励用户探索不同的表达方式`,
};

// 旧版兼容（逐步迁移到 DEFAULT_AGENT_PROMPTS）
export const SYSTEM_PROMPTS: Record<TaskPhase, string> = {
  DEFINING: DEFAULT_AGENT_PROMPTS.TASK_UNDERSTANDING,
  EXECUTING: DEFAULT_AGENT_PROMPTS.EXECUTION,
  REVIEWING: DEFAULT_AGENT_PROMPTS.REVIEW,
};
