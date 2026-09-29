"use server";

/**
 * LLM 设置的服务端 Action：Settings 弹窗读写网关配置、测试连通性。
 * 密钥只在本文件与网关之间流转，绝不返回给浏览器之外的角色使用（浏览器可读回
 * 已保存的 key 仅因本地单机场景需要回显表单，不进入公共环境变量）。
 */
import {
  getStoredLlmSettings,
  saveLlmSettings,
  type LlmSettings,
} from "./server/settings-repository.ts";
import { resolveLlmConfig } from "./config.ts";
import { LiteLLMClient } from "./litellm-client.ts";
import { DefaultLLMService } from "./service.ts";

/** 当前生效配置快照 + 来源：db=Settings 保存过；env=未保存，来自环境变量。 */
export interface LlmSettingsSnapshot extends LlmSettings {
  source: "db" | "env";
}

const DEFAULT_MODEL = "novel-writer";
const CONNECTION_TIMEOUT_MS = 5000;

export async function getLlmSettingsAction(): Promise<LlmSettingsSnapshot> {
  const stored = getStoredLlmSettings();
  const env = process.env;
  return {
    baseUrl: (stored.baseUrl ?? env.LITELLM_BASE_URL ?? "")
      .trim()
      .replace(/\/+$/, ""),
    apiKey: stored.apiKey ?? env.LITELLM_API_KEY ?? "",
    model: stored.model ?? env.LLM_MODEL ?? DEFAULT_MODEL,
    source: stored.baseUrl !== undefined ? "db" : "env",
  };
}

export async function saveLlmSettingsAction(input: {
  baseUrl: string;
  apiKey: string;
  model: string;
}): Promise<LlmSettingsSnapshot> {
  const baseUrl = input.baseUrl.trim().replace(/\/+$/, "");
  const apiKey = input.apiKey.trim();
  const model = input.model.trim() || DEFAULT_MODEL;
  if (!baseUrl || !apiKey) {
    throw new Error("网关地址与 API Key 不能为空");
  }
  saveLlmSettings({ baseUrl, apiKey, model });
  return { baseUrl, apiKey, model, source: "db" };
}

/** 用表单当前值探测网关：GET /v1/models，200 即连通。错误信息不含密钥。 */
export async function testLlmConnectionAction(input: {
  baseUrl: string;
  apiKey: string;
}): Promise<{ ok: boolean; message: string }> {
  const baseUrl = input.baseUrl.trim().replace(/\/+$/, "");
  if (!baseUrl || !input.apiKey.trim()) {
    return { ok: false, message: "请先填写网关地址与 API Key" };
  }
  try {
    const response = await fetch(`${baseUrl}/v1/models`, {
      headers: { authorization: `Bearer ${input.apiKey.trim()}` },
      signal: AbortSignal.timeout(CONNECTION_TIMEOUT_MS),
    });
    if (response.ok) return { ok: true, message: "连接成功" };
    return { ok: false, message: `网关返回状态 ${response.status}` };
  } catch {
    return { ok: false, message: `无法连接 ${baseUrl}（${CONNECTION_TIMEOUT_MS / 1000}s 超时）` };
  }
}

/** Agent 对话消息：首版只传 user/assistant 文本，system 由后续 Agent 上下文引入。 */
export interface AgentChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Agent 面板对话：history 含本轮新消息，整段发给模型实现连续对话。
 * 经 LLMService 落 llm_calls（purpose=chat，runId=会话 ID 聚合多轮）；
 * 非流式（plan.md 步骤 5 才按需加流式）。
 */
export async function sendAgentChatAction(input: {
  runId: string;
  projectId?: string;
  chapterId?: string;
  history: AgentChatMessage[];
}): Promise<{ content: string }> {
  const config = await resolveLlmConfig();
  const service = new DefaultLLMService(new LiteLLMClient(config));
  const response = await service.generate(
    {
      model: config.model,
      messages: input.history,
    },
    {
      runId: input.runId,
      purpose: "chat",
      projectId: input.projectId,
      chapterId: input.chapterId,
    },
  );
  if (!response.content) {
    throw new Error("模型未返回内容");
  }
  return { content: response.content };
}
