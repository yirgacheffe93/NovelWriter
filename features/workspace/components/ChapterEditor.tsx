import {
  SAVE_STATE_CLASS,
  SAVE_STATE_TEXT,
  type SaveState,
} from "@/features/workspace/save-state";
import { countWords } from "@/features/workspace/word-count";
import type { ChapterMetadata } from "@/features/workspace/types";

interface ChapterEditorProps {
  chapter: ChapterMetadata;
  content: string;
  onChange: (value: string) => void;
  saveState: SaveState;
}

export default function ChapterEditor({
  chapter,
  content,
  onChange,
  saveState,
}: ChapterEditorProps) {
  const characterCount = countWords(content);

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
        spellCheck={false}
        placeholder="Start writing..."
        className="min-h-0 flex-1 resize-none px-8 py-6 text-[15px] leading-7 outline-none placeholder:text-zinc-300"
      />

      <div className="flex shrink-0 items-center justify-between border-t border-zinc-200 px-8 py-2 text-xs">
        <span className="tabular-nums text-zinc-400">
          {characterCount.toLocaleString()} 字
        </span>
        {/* 侧栏/DB 是已保存字数，此处是当前草稿字数，脏时两者不等是正常的 */}
        <span className={SAVE_STATE_CLASS[saveState]}>
          {SAVE_STATE_TEXT[saveState]}
        </span>
      </div>
    </main>
  );
}
