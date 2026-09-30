/**
 * LLMClient：项目内的模型调用契约（llm.md §7）。
 * Agent 只依赖此接口，不接触 URL、密钥或供应商响应。
 */
import type { LLMRequest, LLMResponse } from "./types";

export interface LLMClient {
  /**
   * 发起一次非流式生成。options.signal 转发调用方取消；超时由实现内部兜底
   * （llm-integration-plan.md 步骤 2 最小行为：有限超时 + 转发取消信号，不自动重试）。
   */
  generate(
    request: LLMRequest,
    options?: { signal?: AbortSignal },
  ): Promise<LLMResponse>;
}
