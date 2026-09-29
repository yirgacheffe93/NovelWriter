/**
 * LLMService：一次逻辑调用的生命周期管理（llm.md §9）。
 * 唯一写入 llm_calls 的入口；pending → running → completed | failed 逐段落库。
 * 业务性重试由调用方创建新的 LLMCall（llm.md §19）；本服务不重试。
 */
import { performance } from "node:perf_hooks";
import type { LLMClient } from "./client.ts";
import {
  completeCall,
  failCall,
  insertPendingCall,
  markCallRunning,
} from "./server/call-repository.ts";
import type { LLMCallContext, LLMRequest, LLMResponse } from "./types.ts";

export interface LLMService {
  generate(
    request: LLMRequest,
    context: LLMCallContext,
    options?: { signal?: AbortSignal },
  ): Promise<LLMResponse>;
}

export class DefaultLLMService implements LLMService {
  private readonly provider: string;

  constructor(
    private readonly client: LLMClient,
    provider = "litellm",
  ) {
    this.provider = provider;
  }

  async generate(
    request: LLMRequest,
    context: LLMCallContext,
    options?: { signal?: AbortSignal },
  ): Promise<LLMResponse> {
    if (!context.purpose.trim()) {
      throw new Error("LLMCallContext.purpose 不能为空");
    }
    if (context.chapterId && !context.projectId) {
      throw new Error("chapterId 必须伴随 projectId");
    }

    const id = `llm_call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const createdAt = new Date().toISOString();
    insertPendingCall({
      id,
      runId: context.runId,
      projectId: context.projectId,
      chapterId: context.chapterId,
      purpose: context.purpose,
      provider: this.provider,
      model: request.model,
      request,
      createdAt,
    });

    const startedAt = new Date().toISOString();
    markCallRunning(id, startedAt);
    const started = performance.now();
    try {
      const response = await this.client.generate(request, options);
      completeCall(id, {
        response,
        latencyMs: Math.round(performance.now() - started),
        finishedAt: new Date().toISOString(),
      });
      return response;
    } catch (error) {
      // 只落 error.message：LiteLLMClient 的错误信息不含密钥/请求/完整响应（plan.md）
      failCall(id, {
        error: error instanceof Error ? error.message : String(error),
        finishedAt: new Date().toISOString(),
      });
      throw error;
    }
  }
}
