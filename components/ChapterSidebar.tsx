import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { mockChapterVolumes } from "@/lib/mock-data";
import type { Chapter } from "@/lib/types";

interface ChapterSidebarProps {
  projectName: string;
  chapters: Chapter[];
  currentChapterId: string;
  collapsed: boolean;
  onToggle: () => void;
}

export default function ChapterSidebar({
  projectName,
  chapters,
  currentChapterId,
  collapsed,
  onToggle,
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
        className="mx-3 mb-2 rounded border border-dashed border-zinc-300 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
      >
        + New Chapter
      </button>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {mockChapterVolumes.map((volume) => (
          <div key={volume.title} className="mb-1">
            <div className="px-2 py-1 text-[11px] font-medium text-zinc-400">
              {volume.title}
            </div>
            {volume.chapters.map((chapterId) => {
              const chapter = chapters.find((item) => item.id === chapterId);
              if (!chapter) return null;
              return (
                <ChapterItem
                  key={chapter.id}
                  chapter={chapter}
                  selected={chapter.id === currentChapterId}
                />
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function ChapterItem({
  chapter,
  selected,
}: {
  chapter: Chapter;
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
      <span className="w-5 shrink-0 text-xs tabular-nums text-zinc-400">
        {String(chapter.index).padStart(2, "0")}
      </span>
      <span className="truncate">{chapter.title}</span>
      {chapter.status === "draft" && (
        <span className="ml-auto shrink-0 text-[10px] text-zinc-400">草稿</span>
      )}
    </div>
  );
}
