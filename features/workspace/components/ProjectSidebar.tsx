import {
  Archive,
  Library,
  PanelLeftClose,
  Pencil,
  RotateCcw,
  Search,
} from "lucide-react";
import Link from "next/link";
import type { ChapterMetadata, Project } from "@/features/workspace/types";

interface ProjectSidebarProps {
  projects: Project[];
  chapters: ChapterMetadata[];
  currentProjectId: string;
  collapsed: boolean;
  onToggle: () => void;
  onNewProject: () => void;
  onRenameProject: (project: Project) => void;
  onArchiveProject: (project: Project) => void;
  onRestoreProject: (project: Project) => void;
}

export default function ProjectSidebar({
  projects,
  chapters,
  currentProjectId,
  collapsed,
  onToggle,
  onNewProject,
  onRenameProject,
  onArchiveProject,
  onRestoreProject,
}: ProjectSidebarProps) {
  const activeProjects = projects.filter(
    (project) => project.status !== "archived",
  );
  const archivedProjects = projects.filter(
    (project) => project.status === "archived",
  );

  if (collapsed) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center border-r border-zinc-200 bg-zinc-50 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label="展开项目栏"
          className="text-zinc-400 transition-colors hover:text-zinc-900"
        >
          <Library size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-zinc-200 bg-zinc-50">
      <div className="flex h-9 items-center gap-2 px-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Projects
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-label="折叠项目栏"
          className="ml-auto text-zinc-400 transition-colors hover:text-zinc-900"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      <button
        type="button"
        onClick={onNewProject}
        className="mx-3 mb-2 rounded border border-dashed border-zinc-300 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
      >
        + New Project
      </button>

      <div className="mx-3 mb-2 flex items-center gap-1.5 rounded border border-zinc-200 bg-white px-2 py-1">
        <Search size={13} className="shrink-0 text-zinc-400" />
        <input
          readOnly
          placeholder="Search..."
          className="w-full bg-transparent text-xs outline-none placeholder:text-zinc-400"
        />
      </div>

      <nav
        aria-label="Projects"
        className="min-h-0 flex-1 overflow-y-auto px-2 pb-2"
      >
        {activeProjects.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            chapters={chapters}
            selected={project.id === currentProjectId}
            onRename={onRenameProject}
            onArchive={onArchiveProject}
          />
        ))}

        {archivedProjects.length > 0 && (
          <div className="mt-2">
            <div className="px-2 py-1 text-[11px] font-medium text-zinc-400">
              已归档 ({archivedProjects.length})
            </div>
            {archivedProjects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                chapters={chapters}
                selected={project.id === currentProjectId}
                archived
                onRestore={onRestoreProject}
              />
            ))}
          </div>
        )}
      </nav>

      <div className="mt-auto border-t border-zinc-200 px-3 py-2 text-xs text-zinc-500">
        Settings
      </div>
    </aside>
  );
}

function ProjectItem({
  project,
  selected,
  chapters,
  archived = false,
  onRename,
  onArchive,
  onRestore,
}: {
  project: Project;
  selected: boolean;
  chapters: ChapterMetadata[];
  archived?: boolean;
  onRename?: (project: Project) => void;
  onArchive?: (project: Project) => void;
  onRestore?: (project: Project) => void;
}) {
  const projectChapters = chapters.filter(
    (chapter) => chapter.projectId === project.id,
  );
  const wordCount = projectChapters.reduce(
    (sum, chapter) => sum + chapter.wordCount,
    0,
  );

  return (
    <div
      className={`group relative flex items-center rounded px-2 py-1.5 text-sm ${
        selected
          ? "bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
          : "text-zinc-600"
      }`}
    >
      <Link
        href={`/projects/${project.id}`}
        aria-current={selected ? "page" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            selected ? "bg-zinc-900" : "bg-transparent"
          }`}
        />
        <span className="min-w-0 truncate">{project.name}</span>
      </Link>

      {/* hover/focus 显形的行内操作；opacity-0 仍可聚焦，键盘 Tab 进入时显形 */}
      <div className="flex shrink-0 items-center gap-1 pl-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {archived ? (
          <button
            type="button"
            onClick={() => onRestore?.(project)}
            aria-label={`恢复「${project.name}」`}
            className="rounded p-0.5 text-zinc-400 transition-colors hover:text-zinc-900"
          >
            <RotateCcw size={12} />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onRename?.(project)}
              aria-label={`重命名「${project.name}」`}
              className="rounded p-0.5 text-zinc-400 transition-colors hover:text-zinc-900"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={() => onArchive?.(project)}
              aria-label={`归档「${project.name}」`}
              className="rounded p-0.5 text-zinc-400 transition-colors hover:text-zinc-900"
            >
              <Archive size={12} />
            </button>
          </>
        )}
      </div>

      {/* hover 浮窗：简介 + 章节数 + 字数。纯 CSS 显示，不与列表行互抢事件 */}
      <div className="pointer-events-none absolute left-full top-0 z-40 ml-2 hidden w-56 rounded border border-zinc-200 bg-white p-2.5 shadow-md group-hover:block group-focus-within:block">
        <p className="text-xs leading-5 text-zinc-600">
          {project.description ?? "暂无简介"}
        </p>
        <p className="mt-1 text-[11px] tabular-nums text-zinc-400">
          {projectChapters.length} 章 · {wordCount.toLocaleString()} 字
        </p>
      </div>
    </div>
  );
}
