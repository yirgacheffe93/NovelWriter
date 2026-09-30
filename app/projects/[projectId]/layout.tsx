import AppShell from "@/ui/workspace/AppShell";
import {
  listChapters,
  readChapterContent,
} from "@/novel/chapter-repository";
import { listProjects } from "@/novel/project-repository";
import { readProjectMemory } from "@/novel/memory-store";
import { notFound } from "next/navigation";

// 项目与章节列表读自 SQLite，必须动态渲染
export const dynamic = "force-dynamic";

interface ProjectLayoutProps {
  params: Promise<{ projectId: string }>;
  children: React.ReactNode;
}

export default async function ProjectLayout({ params }: ProjectLayoutProps) {
  const { projectId } = await params;

  const projects = await listProjects();
  const project = projects.find((item) => item.id === projectId);
  if (!project) notFound();

  // 全局章节列表：ProjectSidebar 的浮窗要跨项目统计章节数/字数
  const chapters = await listChapters();

  // 当前项目章节的磁盘正文基线（SoT 是 .md 文件），按 index ASC
  const projectChapters = chapters
    .filter((chapter) => chapter.projectId === projectId)
    .sort((a, b) => a.index - b.index);
  const baselineContents: Record<string, string> = {};
  for (const chapter of projectChapters) {
    baselineContents[chapter.id] = readChapterContent(chapter.filePath);
  }

  // 记忆目录清单：只读，文件由构建 memory 的 skill 写入（src/novel/memory-store.ts）
  const memory = readProjectMemory(projectId);

  // 不渲染 children：编辑器会话必须活在 [chapterId] 段之上的 AppShell 里，
  // 切章节才不会重挂载、内存草稿才不会丢；chapters/*/page.tsx 仅作 URL 载体。
  return (
    <AppShell
      project={project}
      projects={projects}
      chapters={chapters}
      baselineContents={baselineContents}
      memory={memory}
    />
  );
}
