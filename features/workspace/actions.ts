"use server";

/**
 * Workspace 域的服务端 Action。
 * 契约见 docs/product/web-ui.md §26.1 Workspace API：Create Project(name) -> Project。
 * 注：本轮按 UI 需要把 description 一并入参，正式接 API 时需同步补进契约。
 */
import {
  createChapter,
  deleteChapter,
  renameChapter,
  saveChapterContent,
} from "./server/chapter-repository";
import {
  createProject,
  getProject,
  updateProject,
} from "./server/project-repository";
import type { ChapterMetadata, Project } from "./types";

export async function createProjectAction(
  name: string,
  description: string,
): Promise<Project> {
  const now = new Date().toISOString();
  const id = `project_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const project: Project = {
    id,
    name: name.trim(),
    // 空简介归一化为 undefined，浮窗的 ?? 兜底才不会渲染空白行
    ...(description.trim() ? { description: description.trim() } : {}),
    rootPath: `data/projects/${id}`,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  createProject(project);
  return project;
}

/** Create Chapter（§26.1）：输入 projectId + title，返回完整 ChapterMetadata。 */
export async function createChapterAction(
  projectId: string,
  title: string,
): Promise<ChapterMetadata> {
  return createChapter(projectId, title);
}

/** Rename Chapter（§26.1）：输入 chapterId + title。 */
export async function renameChapterAction(
  chapterId: string,
  title: string,
): Promise<ChapterMetadata> {
  return renameChapter(chapterId, title);
}

/** Delete Chapter（§26.1）。 */
export async function deleteChapterAction(chapterId: string): Promise<void> {
  deleteChapter(chapterId);
}

/** Save Chapter Content（§26.1）：携带 expectedRevision 做并发校验。 */
export async function saveChapterContentAction(
  chapterId: string,
  content: string,
  expectedRevision: number,
): Promise<ChapterMetadata> {
  return saveChapterContent(chapterId, content, expectedRevision);
}

/** 重命名项目（§7.2）。 */
export async function renameProjectAction(
  projectId: string,
  name: string,
): Promise<Project> {
  const project = getProject(projectId);
  if (!project) throw new Error(`项目不存在：${projectId}`);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("书名不能为空");
  return updateProject({
    ...project,
    name: trimmed,
    updatedAt: new Date().toISOString(),
  });
}

/** 归档项目（§45 软归档）。 */
export async function archiveProjectAction(
  projectId: string,
): Promise<Project> {
  const project = getProject(projectId);
  if (!project) throw new Error(`项目不存在：${projectId}`);
  return updateProject({
    ...project,
    status: "archived",
    updatedAt: new Date().toISOString(),
  });
}

/** §26.1 无 Restore，是本域对 Archive 的对称扩展。 */
export async function restoreProjectAction(
  projectId: string,
): Promise<Project> {
  const project = getProject(projectId);
  if (!project) throw new Error(`项目不存在：${projectId}`);
  return updateProject({
    ...project,
    status: "active",
    updatedAt: new Date().toISOString(),
  });
}
