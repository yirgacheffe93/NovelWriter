import type { Chapter, ChatMessage, Project } from "./types";

export const mockProjects: Project[] = [
  {
    id: "project_001",
    name: "长夜余火",
    rootPath: "data/projects/project_001",
    status: "active",
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-12T09:30:00Z",
  },
  {
    id: "project_002",
    name: "凡人修仙传",
    rootPath: "data/projects/project_002",
    status: "active",
    createdAt: "2026-08-20T10:00:00Z",
    updatedAt: "2026-09-05T18:00:00Z",
  },
  {
    id: "project_003",
    name: "雪中悍刀行",
    rootPath: "data/projects/project_003",
    status: "archived",
    createdAt: "2026-07-11T10:00:00Z",
    updatedAt: "2026-08-02T11:20:00Z",
  },
];

export const mockChapterVolumes = [
  {
    title: "卷一",
    chapters: ["chapter_001", "chapter_002", "chapter_003", "chapter_004"],
  },
  {
    title: "卷二",
    chapters: ["chapter_005", "chapter_006"],
  },
];

export const mockChapters: Chapter[] = [
  {
    id: "chapter_001",
    projectId: "project_001",
    index: 1,
    title: "灰土",
    filePath: "data/projects/project_001/chapters/0001.md",
    status: "final",
    wordCount: 1842,
    revision: 3,
    contentHash: "a1b2c3",
    createdAt: "2026-09-01T10:10:00Z",
    updatedAt: "2026-09-10T14:00:00Z",
  },
  {
    id: "chapter_002",
    projectId: "project_001",
    index: 2,
    title: "苏醒",
    filePath: "data/projects/project_001/chapters/0002.md",
    status: "final",
    wordCount: 2104,
    revision: 2,
    contentHash: "d4e5f6",
    createdAt: "2026-09-02T10:10:00Z",
    updatedAt: "2026-09-11T09:00:00Z",
  },
  {
    id: "chapter_003",
    projectId: "project_001",
    index: 3,
    title: "小队",
    filePath: "data/projects/project_001/chapters/0003.md",
    status: "draft",
    wordCount: 967,
    revision: 1,
    contentHash: "7890ab",
    createdAt: "2026-09-05T10:10:00Z",
    updatedAt: "2026-09-12T09:30:00Z",
  },
  {
    id: "chapter_004",
    projectId: "project_001",
    index: 4,
    title: "出发",
    filePath: "data/projects/project_001/chapters/0004.md",
    status: "draft",
    wordCount: 0,
    revision: 0,
    contentHash: "",
    createdAt: "2026-09-06T10:10:00Z",
    updatedAt: "2026-09-06T10:10:00Z",
  },
  {
    id: "chapter_005",
    projectId: "project_001",
    index: 5,
    title: "城市",
    filePath: "data/projects/project_001/chapters/0005.md",
    status: "draft",
    wordCount: 0,
    revision: 0,
    contentHash: "",
    createdAt: "2026-09-07T10:10:00Z",
    updatedAt: "2026-09-07T10:10:00Z",
  },
  {
    id: "chapter_006",
    projectId: "project_001",
    index: 6,
    title: "遗迹",
    filePath: "data/projects/project_001/chapters/0006.md",
    status: "draft",
    wordCount: 0,
    revision: 0,
    contentHash: "",
    createdAt: "2026-09-08T10:10:00Z",
    updatedAt: "2026-09-08T10:10:00Z",
  },
];

/**
 * 正文的 Source of Truth 是章节 Markdown 文件，不属于 Chapter 结构。
 * 这里用它代替文件读取，Phase 3 接入 Editor 时再换成真实读取。
 */
/**
 * 对话记录。一条用户消息对应一个 AgentRun，一条 agent 回复对应一个 Generation。
 */
export const mockMessages: ChatMessage[] = [
  {
    id: "msg_001",
    role: "user",
    content: "继续写下一章。主角第一次进入古城，需要有一种压抑和危险的感觉，最后留下一个悬念。",
    createdAt: "2026-09-12T09:28:00Z",
  },
  {
    id: "msg_002",
    role: "agent",
    content: `风从灰土上刮过去的时候，什么都不会留下。

他蹲在废弃的加油站顶上，看着远处那条被沙埋了一半的公路。三天前他从那里过来，现在它已经窄得像一根线。

"还有多远？"身后的人问。

他没有回头。

"走到不能再走为止。"`,
    createdAt: "2026-09-12T09:30:00Z",
    disposition: "applied",
  },
];

export const mockChapterContents: Record<string, string> = {
  chapter_001: `风从灰土上刮过去的时候，什么都不会留下。

他蹲在废弃的加油站顶上，看着远处那条被沙埋了一半的公路。三天前他从那里过来，现在它已经窄得像一根线。

"还有多远？"身后的人问。

他没有回头。

"走到不能再走为止。"`,
};
