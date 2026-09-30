import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import SidebarResizeHandle from "./SidebarResizeHandle";
import { usePersistedToggle } from "./persisted-layout";
import {
  MEMORY_KIND_LABELS,
  type MemoryGroup,
  type ProjectMemory,
} from "@/novel/memory";
import type { ChapterMetadata } from "@/novel/types";

const MIN_WIDTH = 180;
const MAX_WIDTH = 520;
/**
 * 章节列表的可视高度：约 10 行（每行 py-1.5 + text-sm 行高 = 32px）。
 * 多出来的章节靠列表内部滚动，不把侧栏整体撑长。
 */
const CHAPTER_LIST_HEIGHT = "max-h-80";
/** 与上面配套的可视行数：超过这个数就一定会溢出，两端各留一行给省略号。 */
const CHAPTER_VISIBLE_ROWS = 10;
/**
 * 判定「已经滚到头」的容差：最后几像素（滚动条亚像素、末行的行内留白）不值得
 * 再显示一个省略号，否则深链打开最后一章时两端会同时显示提示。
 */
const SCROLL_EDGE_TOLERANCE = 8;

interface ChapterSidebarProps {
  projectId: string;
  projectName: string;
  chapters: ChapterMetadata[];
  currentChapterId: string | null;
  /** 记忆目录清单（只读，由构建 memory 的 skill 写入） */
  memory: ProjectMemory;
  /** 当前打开的 memory 路径段，如 ["characters", "林默"]；未打开则为 null */
  currentMemoryPath: string[] | null;
  collapsed: boolean;
  onToggle: () => void;
  onNewChapter: () => void;
  onRenameChapter: (chapter: ChapterMetadata) => void;
  onDeleteChapter: (chapter: ChapterMetadata) => void;
  width: number;
  onWidthChange: (width: number) => void;
}

export default function ChapterSidebar({
  projectId,
  projectName,
  chapters,
  currentChapterId,
  memory,
  currentMemoryPath,
  collapsed,
  onToggle,
  onNewChapter,
  onRenameChapter,
  onDeleteChapter,
  width,
  onWidthChange,
}: ChapterSidebarProps) {  const [chaptersCollapsed, toggleChapters] = usePersistedToggle(
    "novelwriter.chapterSidebar.chaptersCollapsed",
  );
  const [memoryCollapsed, toggleMemory] = usePersistedToggle(
    "novelwriter.chapterSidebar.memoryCollapsed",
  );
  const { listRef, attachList, syncListEdges, listEdges } =
    useChapterListScroll();

  // 列表比可视区长时，当前章节可能在视口之外（深链打开、刚切章）
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [currentChapterId, listRef]);

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

  // 列表一定会溢出时才留出省略号那两行：高度从首屏就固定，滚动时不会再变
  const reserveHintRows = chapters.length > CHAPTER_VISIBLE_ROWS;

  return (
    <aside
      style={{ width }}
      className="relative flex shrink-0 flex-col border-r border-zinc-200 bg-zinc-50"
    >
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

      {/* 两个分组各自滚动：标题栏留在滚动容器之外，因此始终可见 */}
      <nav
        aria-label="章节与记忆"
        className="flex min-h-0 flex-1 flex-col px-2 pb-3"
      >
        <SectionHeader
          label="Chapters"
          count={chapters.length}
          collapsed={chaptersCollapsed}
          onToggle={toggleChapters}
        />
        {!chaptersCollapsed && (
          // 省略号在滚动容器之外各占一行（见 ScrollHintRow），列表本身固定在约 10 行高
          <>
            {reserveHintRows && <ScrollHintRow visible={listEdges.above} />}
            <div
              ref={attachList}
              onScroll={syncListEdges}
              className={`min-h-0 overflow-y-auto ${CHAPTER_LIST_HEIGHT}`}
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
            </div>
            {reserveHintRows && <ScrollHintRow visible={listEdges.below} />}
          </>
        )}

        <SectionHeader
          label="Memory"
          collapsed={memoryCollapsed}
          onToggle={toggleMemory}
        />
        {!memoryCollapsed && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <MemoryTree
              projectId={projectId}
              memory={memory}
              currentPath={currentMemoryPath}
            />
          </div>
        )}
      </nav>

      <SidebarResizeHandle
        width={width}
        min={MIN_WIDTH}
        max={MAX_WIDTH}
        onWidthChange={onWidthChange}
      />
    </aside>
  );
}

/** 可折叠的分组标题：箭头 + 名称 + 可选计数。 */
function SectionHeader({
  label,
  count,
  collapsed,
  onToggle,
}: {
  label: string;
  count?: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const Chevron = collapsed ? ChevronRight : ChevronDown;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      className="mt-2 flex w-full items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 transition-colors hover:text-zinc-600"
    >
      <Chevron size={12} className="shrink-0" />
      {label}
      {count !== undefined && (
        <span className="ml-auto tabular-nums">{count}</span>
      )}
    </button>
  );
}

/** 五类记忆。时间线是单文件，其余分类展开后列出实体。 */
function MemoryTree({
  projectId,
  memory,
  currentPath,
}: {
  projectId: string;
  memory: ProjectMemory;
  currentPath: string[] | null;
}) {
  return (
    <div>
      <MemoryRow
        label="时间线"
        href={`/projects/${projectId}/memory/timeline`}
        selected={isSelected(currentPath, ["timeline"])}
      />
      {memory.groups.map((group) => (
        <MemoryKindGroup
          key={group.kind}
          projectId={projectId}
          group={group}
          currentPath={currentPath}
        />
      ))}
    </div>
  );
}

function MemoryKindGroup({
  projectId,
  group,
  currentPath,
}: {
  projectId: string;
  group: MemoryGroup;
  currentPath: string[] | null;
}) {
  const [collapsed, toggle] = usePersistedToggle(
    `novelwriter.memory.${group.kind}Collapsed`,
  );

  return (
    <>
      <MemoryRow
        label={MEMORY_KIND_LABELS[group.kind]}
        count={group.items.length}
        collapsed={collapsed}
        onToggle={toggle}
      />
      {!collapsed &&
        group.items.map((item) => (
          <MemoryRow
            key={item.title}
            label={item.title}
            indent
            href={`/projects/${projectId}/memory/${group.kind}/${encodeURIComponent(item.title)}`}
            selected={isSelected(currentPath, item.path)}
          />
        ))}
    </>
  );
}

/**
 * 记忆树的一行。带 href 的是可点条目；只有 onToggle 的是可折叠的分类行。
 * 分类行即便为空也可点开（展开后为空），避免"点不动"的疑惑。
 */
function MemoryRow({
  label,
  count,
  collapsed,
  onToggle,
  href,
  selected = false,
  indent = false,
}: {
  label: string;
  count?: number;
  collapsed?: boolean;
  onToggle?: () => void;
  href?: string;
  selected?: boolean;
  indent?: boolean;
}) {
  const base = `flex items-center gap-1 rounded py-1 text-sm ${
    indent ? "pl-6 pr-2" : "px-2"
  }`;

  if (href) {
    return (
      <Link
        href={href}
        aria-current={selected ? "page" : undefined}
        className={`${base} ${
          selected
            ? "bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
            : "text-zinc-600 transition-colors hover:bg-zinc-100"
        }`}
      >
        <span className="min-w-0 truncate">{label}</span>
      </Link>
    );
  }

  const Chevron = collapsed ? ChevronRight : ChevronDown;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      className={`${base} w-full text-zinc-600 transition-colors hover:bg-zinc-100`}
    >
      <Chevron size={12} className="shrink-0 text-zinc-400" />
      <span className="min-w-0 truncate">{label}</span>
      {count !== undefined && (
        <span className="ml-auto shrink-0 text-xs tabular-nums text-zinc-400">
          {count}
        </span>
      )}
    </button>
  );
}

/** URL 路径段与条目是否一致（用于选中态）。 */
function isSelected(current: string[] | null, target: string[]): boolean {
  if (current === null || current.length !== target.length) return false;
  return current.every((segment, index) => segment === target[index]);
}

/**
 * 章节列表的滚动边界：两端是否还有被视口挡住的章节。
 *
 * 测量放在 ref 回调里而不是 effect 里：挂载后要立刻知道底部还有没有内容
 * （否则底部的省略号要等用户滚一次才出现），而 effect 里 setState 被
 * react-hooks/set-state-in-effect 拦下。回调只在挂载/卸载时被调用，不会每次
 * 渲染都量一遍；状态值未变时返回原对象，滚动时也就不触发重渲染。
 */
function useChapterListScroll() {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [listEdges, setListEdges] = useState({ above: false, below: false });

  const syncListEdges = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const above = list.scrollTop > 0;
    const below =
      list.scrollTop + list.clientHeight <
      list.scrollHeight - SCROLL_EDGE_TOLERANCE;
    setListEdges((prev) =>
      prev.above === above && prev.below === below ? prev : { above, below },
    );
  }, []);

  const attachList = useCallback(
    (list: HTMLDivElement | null) => {
      listRef.current = list;
      if (list) syncListEdges();
    },
    [syncListEdges],
  );

  return { listRef, attachList, syncListEdges, listEdges };
}

/**
 * 列表两端「这个方向还有章节」的省略号，各占独立一行。
 *
 * 刻意放在滚动容器外面：不进滚动内容，就不会和章节文字叠在一起，也不会挡住点击。
 * 行本身常驻（由 reserveHintRows 决定要不要留），只切换点的明暗，所以滚动时
 * 布局高度不会跟着变。
 */
function ScrollHintRow({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden
      className={`flex h-5 shrink-0 items-center justify-center text-zinc-400 transition-opacity ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <MoreHorizontal size={14} />
    </div>
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
