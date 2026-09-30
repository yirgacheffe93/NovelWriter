/**
 * 项目内稳定的 LLM 错误类别（llm-integration-plan.md 步骤 2 错误归一化）。
 * 错误信息不含密钥、请求正文或完整供应商响应。
 */
export class LLMError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** 服务端未配置 LITELLM_BASE_URL / LITELLM_API_KEY。 */
export class LLMConfigError extends LLMError {}

/** 请求携带了首版尚未实现的字段（tools / responseFormat 等）。 */
export class LLMUnsupportedError extends LLMError {}

/** 无法连接网关（DNS、连接拒绝等）。 */
export class LLMConnectionError extends LLMError {}

/** 网关超时或调用方取消。 */
export class LLMTimeoutError extends LLMError {}

/** 网关返回非 2xx。只保留状态码，不携带响应体。 */
export class LLMHttpError extends LLMError {
  readonly status: number;

  constructor(status: number) {
    super(`LLM 网关返回 HTTP ${status}`);
    this.status = status;
  }
}

/** 网关返回了无法解析为统一响应的内容。 */
export class LLMInvalidResponseError extends LLMError {}
