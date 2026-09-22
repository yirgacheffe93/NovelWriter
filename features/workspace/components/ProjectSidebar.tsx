import {
  Archive,
  ChevronDown,
  ChevronRight,
  Library,
  PanelLeftClose,
  Pencil,
  RotateCcw,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
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
  // 分组折叠状态：均默认展开。切项目会重挂载侧栏，若删除区默认折叠，
  // 选中归档项目后列表会「消失」——保持与工作区一致的默认展开行为
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);
  const [deleteCollapsed, setDeleteCollapsed] = useState(false);

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
        <span className="shrink-0 text-[13px] font-semibold uppercase tracking-wide text-zinc-500">
          Projects
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded border border-zinc-200 bg-white px-2 py-1">
          <Search size={12} className="shrink-0 text-zinc-400" />
          <input
            readOnly
            placeholder="Search..."
            className="w-full min-w-0 bg-transparent text-[11px] outline-none placeholder:text-zinc-400"
          />
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label="折叠项目栏"
          className="shrink-0 text-zinc-400 transition-colors hover:text-zinc-900"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      {/* 创建区 */}
      <button
        type="button"
        onClick={onNewProject}
        className="mx-3 mb-2 rounded border border-dashed border-zinc-300 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
      >
        + New Project
      </button>

      {/* 列表区：Work Space 分组 + Delete 分组，共用滚动容器 */}
      <nav
        aria-label="Projects"
        className="min-h-0 flex-1 overflow-y-auto px-2 pb-2"
      >
        <SectionHeader
          collapsed={workspaceCollapsed}
          onToggle={() => setWorkspaceCollapsed((value) => !value)}
        >
          Work Space
        </SectionHeader>

        {!workspaceCollapsed &&
          activeProjects.map((project) => (
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
            <SectionHeader
              collapsed={deleteCollapsed}
              onToggle={() => setDeleteCollapsed((value) => !value)}
            >
              <Trash2 size={12} className="shrink-0" />
              Delete
            </SectionHeader>
            {!deleteCollapsed &&
              archivedProjects.map((project) => (
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

      <div className="mt-auto flex items-center gap-1.5 border-t border-zinc-200 px-3 py-2 text-xs text-zinc-500">
        <Settings size={13} className="shrink-0" />
        Settings
      </div>
    </aside>
  );
}

/**
 * 分组标题：悬浮卡片样式（白底+细边框+阴影），与侧栏灰底形成浮起层次，
 * 暗示可点击；hover 阴影/文字加深，按下回落到平面。
 * 左侧图标+文字，右侧 chevron 指示折叠状态（▾ 展开 / ▸ 折叠）。
 */
function SectionHeader({
  collapsed,
  onToggle,
  children,
}: {
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const Chevron = collapsed ? ChevronRight : ChevronDown;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      className="mb-1 flex w-full items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 shadow-sm transition-all hover:border-zinc-300 hover:text-zinc-700 hover:shadow-md active:bg-zinc-50 active:shadow-sm"
    >
      {children}
      <Chevron size={12} className="ml-auto shrink-0" />
    </button>
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
  // 浮窗视口坐标。渲染到 body 的 fixed 层，避免被列表容器的 overflow 裁剪
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

  // 选中凸显：较深底色（无框线），工作区与删除区一致
  const selectedClass = selected
    ? "bg-zinc-200 font-medium text-zinc-900"
    : "text-zinc-600";

  return (
    <div
      className={`group relative flex items-center rounded px-2 py-1.5 text-sm ${selectedClass}`}
      onMouseEnter={(event) => setTooltip({ x: event.clientX, y: event.clientY })}
      onMouseMove={(event) => setTooltip({ x: event.clientX, y: event.clientY })}
      onMouseLeave={() => setTooltip(null)}
      onFocus={(event) => {
        // 键盘 Tab 聚焦行内元素时显示：以行的右边缘为锚点
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltip({ x: rect.right + 8, y: rect.top });
      }}
      onBlur={() => setTooltip(null)}
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

      {/* 简介浮窗：fixed 渲染到 body，跟随鼠标，不被列表容器的 overflow 裁剪 */}
      {tooltip &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50 w-56 rounded border border-zinc-200 bg-white p-2.5 shadow-md"
            style={{ left: tooltip.x + 16, top: tooltip.y + 12 }}
          >
            <p className="text-xs leading-5 text-zinc-600">
              {project.description ?? "暂无简介"}
            </p>
            <p className="mt-1 text-[11px] tabular-nums text-zinc-400">
              {projectChapters.length} 章 · {wordCount.toLocaleString()} 字
            </p>
          </div>,
          document.body,
        )}
    </div>
  );
}
