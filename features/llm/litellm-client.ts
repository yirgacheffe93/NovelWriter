/**
 * LiteLLMClient：OpenAI Chat Completions 兼容的 HTTP 适配器（plan.md 步骤 2）。
 * 只做请求映射、有限超时、取消信号转发与错误归一化；不自动重试——
 * 重试/fallback 属于网关（LiteLLM Proxy），避免双层重试同一请求。
 */
import type { LLMClient } from "./client.ts";
import type { LLMConfig } from "./config.ts";
import {
  LLMConnectionError,
  LLMHttpError,
  LLMInvalidResponseError,
  LLMTimeoutError,
  LLMUnsupportedError,
} from "./errors.ts";
import type { LLMRequest, LLMResponse, LLMUsage } from "./types.ts";

const DEFAULT_TIMEOUT_MS = 30_000;

/** OpenAI Chat Completions 响应中本适配器用到的字段。 */
interface OpenAIResponse {
  id?: string;
  choices?: {
    message?: { content?: string | null };
    finish_reason?: string | null;
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export class LiteLLMClient implements LLMClient {
  private readonly config: LLMConfig;
  /** 供测试缩短；生产用默认 30s。 */
  private readonly timeoutMs: number;

  constructor(config: LLMConfig, timeoutMs = DEFAULT_TIMEOUT_MS) {
    this.config = config;
    this.timeoutMs = timeoutMs;
  }

  async generate(
    request: LLMRequest,
    options?: { signal?: AbortSignal },
  ): Promise<LLMResponse> {
    // 首版未实现的字段明确拒绝，不静默忽略（plan.md 步骤 2）
    if (request.tools?.length || request.responseFormat !== undefined) {
      throw new LLMUnsupportedError(
        "tools / responseFormat 尚未实现，请勿发送",
      );
    }

    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
    const signal = options?.signal
      ? AbortSignal.any([options.signal, timeoutSignal])
      : timeoutSignal;

    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages.map((message) => ({
            role: message.role,
            content: message.content,
            ...(message.name ? { name: message.name } : {}),
          })),
          ...(request.temperature !== undefined
            ? { temperature: request.temperature }
            : {}),
          ...(request.topP !== undefined ? { top_p: request.topP } : {}),
          ...(request.maxTokens !== undefined
            ? { max_tokens: request.maxTokens }
            : {}),
        }),
        signal,
      });
    } catch (error) {
      // 错误信息不携带 URL 或密钥；原始错误只进 cause 供调试。
      // AbortSignal.timeout 的 reason 名为 TimeoutError，调用方 abort 为 AbortError
      if (
        error instanceof Error &&
        (error.name === "AbortError" || error.name === "TimeoutError")
      ) {
        throw new LLMTimeoutError(
          options?.signal?.aborted
            ? "调用已取消"
            : `调用超时（${this.timeoutMs}ms）`,
          { cause: error },
        );
      }
      throw new LLMConnectionError("无法连接 LLM 网关", { cause: error });
    }

    if (!response.ok) {
      // 只保留状态码，不携带供应商响应体（可能含模型输出或调试信息）
      throw new LLMHttpError(response.status);
    }

    const body = (await response
      .json()
      .catch(() => {
        throw new LLMInvalidResponseError("网关响应不是合法 JSON");
      })) as OpenAIResponse;

    const choice = body.choices?.[0];
    if (!choice?.message) {
      throw new LLMInvalidResponseError("网关响应缺少 choices");
    }

    return {
      ...(choice.message.content !== null && choice.message.content !== undefined
        ? { content: choice.message.content }
        : {}),
      ...(choice.finish_reason != null
        ? { finishReason: choice.finish_reason }
        : {}),
      ...(body.usage
        ? { usage: toUsage(body.usage, response.headers) }
        : {}),
      providerRequestId:
        body.id ?? response.headers.get("x-request-id") ?? undefined,
    };
  }
}

/** OpenAI usage → 项目 LLMUsage；费用取自 x-litellm-response-cost（USD→micros），取不到保持为空（plan.md）。 */
function toUsage(usage: NonNullable<OpenAIResponse["usage"]>, headers: Headers): LLMUsage {
  const result: LLMUsage = {};
  if (usage.prompt_tokens !== undefined) result.inputTokens = usage.prompt_tokens;
  if (usage.completion_tokens !== undefined) result.outputTokens = usage.completion_tokens;
  if (usage.total_tokens !== undefined) result.totalTokens = usage.total_tokens;

  const costHeader = headers.get("x-litellm-response-cost");
  if (costHeader !== null) {
    const costUsd = Number.parseFloat(costHeader);
    if (!Number.isNaN(costUsd)) {
      result.costMicros = Math.round(costUsd * 1_000_000);
      result.costCurrency = "USD";
    }
  }
  return result;
}
