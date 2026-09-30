/**
 * 一个 Agent 回合：装配请求、调用模型、返回结果。
 *
 * 这里只回答"为什么、什么时候调用模型"；"怎么调"在 src/llm/。
 * 本层不 import src/novel/——小说内容将来通过 prompt、skill 与工具注入，
 * 见 docs/architecture/structure.md §3 与 §4。
 */
import { resolveLlmConfig } from "../llm/config.ts";
import { LiteLLMClient } from "../llm/providers/litellm.ts";
import { DefaultLLMService } from "../llm/service.ts";

/** Agent 对话消息：首版只传 user/assistant 文本，system 由后续上下文引入。 */
export interface AgentChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** 一次回合的归属信息，写入 llm_calls 供查询与聚合。 */
export interface TurnContext {
  runId: string;
  projectId?: string;
  chapterId?: string;
}

/**
 * 跑一个回合。history 含本轮新消息，整段发给模型实现连续对话。
 * 非流式；流式见 docs/architecture/llm.md §20 的分层。
 */
export async function runTurn(
  history: AgentChatMessage[],
  context: TurnContext,
): Promise<{ content: string }> {
  const config = await resolveLlmConfig();
  const service = new DefaultLLMService(new LiteLLMClient(config));
  const response = await service.generate(
    {
      model: config.model,
      messages: history,
    },
    {
      runId: context.runId,
      purpose: "chat",
      projectId: context.projectId,
      chapterId: context.chapterId,
    },
  );
  if (!response.content) {
    throw new Error("模型未返回内容");
  }
  return { content: response.content };
}
