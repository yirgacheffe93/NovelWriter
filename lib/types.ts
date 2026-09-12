export type ProjectStatus = "active" | "archived";

export interface Project {
  id: string;
  name: string;
  description?: string;
  rootPath: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export type ChapterStatus = "draft" | "final";

export interface Chapter {
  id: string;
  projectId: string;
  index: number;
  title: string;
  filePath: string;
  status: ChapterStatus;
  wordCount: number;
  revision: number;
  contentHash: string;
  createdAt: string;
  updatedAt: string;
}

export type AgentRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * 生成结果是否已进入正文。
 * 写入前会校验 Chapter revision / contentHash，不一致时记为 conflict 且不覆盖正文。
 */
export type GenerationDisposition = "pending" | "applied" | "conflict";

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  createdAt: string;
  /** 仅 agent 消息有：该条回复对应的 Generation 落定状态 */
  disposition?: GenerationDisposition;
}
