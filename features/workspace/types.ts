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
