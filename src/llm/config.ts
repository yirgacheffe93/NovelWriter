/**
 * LLM 配置：只在 Node.js 服务端读取 process.env，绝不加 NEXT_PUBLIC_ 前缀
 * （llm-integration-plan.md 步骤 2：不在公共环境变量或浏览器代码中暴露密钥）。
 * env 参数化便于测试；调用时才校验，缺失抛 LLMConfigError。
 */
import { LLMConfigError } from "./errors.ts";
import { getStoredLlmSettings } from "./settings-repository.ts";

export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  /** 默认取 LiteLLM 配置的别名（litellm/config.yaml 的 novel-writer）。 */
  model: string;
}

/**
 * 配置来源的宽松类型：Next 会给 NodeJS.ProcessEnv 增加必填 NODE_ENV，
 * 测试伪造 env 字面量不满足它，这里只声明本模块读取的字段形状。
 */
type EnvLike = Record<string, string | undefined>;

export function getLlmConfig(env: EnvLike = process.env): LLMConfig {
  const baseUrl = env.LITELLM_BASE_URL?.trim().replace(/\/+$/, "");
  const apiKey = env.LITELLM_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new LLMConfigError(
      "未配置 LLM：请在服务端环境变量设置 LITELLM_BASE_URL 与 LITELLM_API_KEY",
    );
  }
  return { baseUrl, apiKey, model: env.LLM_MODEL || "novel-writer" };
}

/**
 * 解析生效配置：Settings 弹窗保存的值（app_settings 表）优先，缺项回退环境变量。
 * 未在 UI 保存过任何设置时与 getLlmConfig 行为一致（部署者经 env 配置）。
 */
export async function resolveLlmConfig(
  env: EnvLike = process.env,
): Promise<LLMConfig> {
  const stored = getStoredLlmSettings();
  const baseUrl = (stored.baseUrl ?? env.LITELLM_BASE_URL)
    ?.trim()
    .replace(/\/+$/, "");
  const apiKey = stored.apiKey ?? env.LITELLM_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new LLMConfigError(
      "未配置 LLM：请在 Settings 中设置网关地址与 API Key，或通过服务端环境变量 LITELLM_BASE_URL / LITELLM_API_KEY 提供",
    );
  }
  return {
    baseUrl,
    apiKey,
    model: stored.model?.trim() || env.LLM_MODEL || "novel-writer",
  };
}
