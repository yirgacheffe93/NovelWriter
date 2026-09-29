/**
 * LLM 模块统一类型（docs/architecture/llm.md §5/§6/§9/§11）。
 * 首版只支持 system/user/assistant 文本消息；tools/responseFormat 等字段
 * 类型上保留占位，但 LiteLLMClient 收到非空值会明确拒绝（plan.md 步骤 2）。
 */

export type LLMRole = "system" | "user" | "assistant" | "tool";

export interface LLMMessage {
  role: LLMRole;
  content: string;
  name?: string;
}

export interface LLMRequest {
  /** LiteLLM 对外暴露的模型别名，不是供应商内部模型名（plan.md 首版接口） */
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  tools?: unknown[];
  responseFormat?: unknown;
}

export interface LLMUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costMicros?: number;
  costCurrency?: string;
}

export interface LLMResponse {
  content?: string;
  finishReason?: string;
  usage?: LLMUsage;
  providerRequestId?: string;
}

export interface LLMCallContext {
  runId?: string;
  purpose: string;
  projectId?: string;
  chapterId?: string;
}

export type LLMCallStatus = "pending" | "running" | "completed" | "failed";

/** 一次逻辑调用的完整记录（llm.md §11）；状态转换 pending → running → completed | failed。 */
export interface LLMCall {
  id: string;
  runId?: string;
  projectId?: string;
  chapterId?: string;
  purpose: string;
  provider?: string;
  model: string;
  request: LLMRequest;
  response?: LLMResponse;
  status: LLMCallStatus;
  usage?: LLMUsage;
  latencyMs?: number;
  providerRequestId?: string;
  error?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}
