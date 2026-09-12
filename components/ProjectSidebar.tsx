import { Library, PanelLeftClose, Search } from "lucide-react";
import type { Project } from "@/lib/types";

interface ProjectSidebarProps {
  projects: Project[];
  currentProjectId: string;
  collapsed: boolean;
  onToggle: () => void;
}

export default function ProjectSidebar({
  projects,
  currentProjectId,
  collapsed,
  onToggle,
}: ProjectSidebarProps) {
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

      <nav className="flex flex-col gap-0.5 px-2">
        {projects.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            selected={project.id === currentProjectId}
          />
        ))}
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
}: {
  project: Project;
  selected: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
        selected
          ? "bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
          : "text-zinc-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          selected ? "bg-zinc-900" : "bg-transparent"
        }`}
      />
      <span className="truncate">{project.name}</span>
      {project.status === "archived" && (
        <span className="ml-auto shrink-0 text-[10px] text-zinc-400">已归档</span>
      )}
    </div>
  );
}
