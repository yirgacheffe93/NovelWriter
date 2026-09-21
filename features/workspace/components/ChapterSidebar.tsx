import { PanelLeftClose, PanelLeftOpen, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import type { ChapterMetadata } from "@/features/workspace/types";

interface ChapterSidebarProps {
  projectId: string;
  projectName: string;
  chapters: ChapterMetadata[];
  currentChapterId: string | null;
  collapsed: boolean;
  onToggle: () => void;
  onNewChapter: () => void;
  onRenameChapter: (chapter: ChapterMetadata) => void;
  onDeleteChapter: (chapter: ChapterMetadata) => void;
}

export default function ChapterSidebar({
  projectId,
  projectName,
  chapters,
  currentChapterId,
  collapsed,
  onToggle,
  onNewChapter,
  onRenameChapter,
  onDeleteChapter,
}: ChapterSidebarProps) {
  if (collapsed) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center border-r border-zinc-200 bg-zinc-50 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label="展开章节栏"
          className="text-zinc-400 transition-colors hover:text-zinc-900"
        >
          <PanelLeftOpen size={17} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-zinc-200 bg-zinc-50">
      <div className="flex h-9 items-center gap-2 px-3">
        <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          {projectName}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-label="折叠章节栏"
          className="ml-auto shrink-0 text-zinc-400 transition-colors hover:text-zinc-900"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      <button
        type="button"
        onClick={onNewChapter}
        className="mx-3 mb-2 rounded border border-dashed border-zinc-300 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
      >
        + New Chapter
      </button>

      {chapters.length === 0 && (
        <div className="mx-3 mb-2 flex flex-col items-start gap-1.5">
          <p className="text-xs text-zinc-400">
            This novel has no chapters.
          </p>
          <button
            type="button"
            onClick={onNewChapter}
            className="rounded border border-dashed border-zinc-300 px-2 py-1 text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
          >
            Create Chapter
          </button>
        </div>
      )}

      <nav
        aria-label="Chapters"
        className="min-h-0 flex-1 overflow-y-auto px-2 pb-3"
      >
        {chapters.map((chapter) => (
          <ChapterItem
            key={chapter.id}
            projectId={projectId}
            chapter={chapter}
            selected={chapter.id === currentChapterId}
            onRename={onRenameChapter}
            onDelete={onDeleteChapter}
          />
        ))}
      </nav>
    </aside>
  );
}

function ChapterItem({
  projectId,
  chapter,
  selected,
  onRename,
  onDelete,
}: {
  projectId: string;
  chapter: ChapterMetadata;
  selected: boolean;
  onRename: (chapter: ChapterMetadata) => void;
  onDelete: (chapter: ChapterMetadata) => void;
}) {
  return (
    <div
      className={`group relative flex items-center rounded px-2 py-1.5 text-sm ${
        selected
          ? "bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
          : "text-zinc-600"
      }`}
    >
      <Link
        href={`/projects/${projectId}/chapters/${chapter.id}`}
        aria-current={selected ? "page" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        <span className="w-5 shrink-0 text-xs tabular-nums text-zinc-400">
          {String(chapter.index).padStart(2, "0")}
        </span>
        <span className="min-w-0 truncate">{chapter.title}</span>
        {chapter.status === "draft" && (
          <span className="shrink-0 text-[10px] text-zinc-400">草稿</span>
        )}
      </Link>

      {/* hover/focus 显形的行内操作；opacity-0 仍可聚焦，键盘 Tab 进入时显形 */}
      <div className="flex shrink-0 items-center gap-1 pl-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          onClick={() => onRename(chapter)}
          aria-label={`重命名「${chapter.title}」`}
          className="rounded p-0.5 text-zinc-400 transition-colors hover:text-zinc-900"
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(chapter)}
          aria-label={`删除「${chapter.title}」`}
          className="rounded p-0.5 text-zinc-400 transition-colors hover:text-red-600"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
