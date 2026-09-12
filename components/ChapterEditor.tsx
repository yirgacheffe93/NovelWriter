import type { Chapter } from "@/lib/types";

interface ChapterEditorProps {
  chapter: Chapter;
  content: string;
  onChange: (value: string) => void;
  /** 返回 true 表示已撤销一次生成写入，调用方无需再走浏览器原生 undo */
  onUndo: () => boolean;
}

export default function ChapterEditor({
  chapter,
  content,
  onChange,
  onUndo,
}: ChapterEditorProps) {
  const characterCount = content.replace(/\s/g, "").length;

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const isUndo =
      (event.metaKey || event.ctrlKey) &&
      !event.shiftKey &&
      event.key.toLowerCase() === "z";
    if (isUndo && onUndo()) {
      event.preventDefault();
    }
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-white">
      <div className="shrink-0 border-b border-zinc-200 px-8 py-3">
        <h1 className="text-base font-semibold tracking-tight">
          {chapter.title}
        </h1>
        <p className="mt-0.5 text-xs text-zinc-400">
          第 {chapter.index} 章 · {chapter.status} · revision {chapter.revision}
        </p>
      </div>

      <textarea
        value={content}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        placeholder="Start writing..."
        className="min-h-0 flex-1 resize-none px-8 py-6 text-[15px] leading-7 outline-none placeholder:text-zinc-300"
      />

      <div className="flex shrink-0 items-center justify-between border-t border-zinc-200 px-8 py-2 text-xs text-zinc-400">
        <span className="tabular-nums">
          {characterCount.toLocaleString()} 字
        </span>
        <span>Saved</span>
      </div>
    </main>
  );
}
