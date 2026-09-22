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

export interface ChapterMetadata {
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

/** txt 导入的解析结果：待建章节的标题与正文。 */
export interface ImportedNovelItem {
  title: string;
  content: string;
}

/** importNovelAction 的返回：新建项目 + 各章节元数据与正文（供前端种子会话）。 */
export interface ImportedNovel {
  project: Project;
  items: { chapter: ChapterMetadata; content: string }[];
}
