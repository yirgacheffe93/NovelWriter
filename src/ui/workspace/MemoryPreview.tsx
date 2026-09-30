import type { MemoryItem } from "@/novel/memory";

/**
 * 记忆条目的只读预览。
 * 内容由构建 memory 的 skill 写入，界面不提供编辑——所以这里刻意用
 * pre-wrap 呈现原文，不做 Markdown 渲染，避免把 skill 的原始输出"翻译"一遍。
 */
export default function MemoryPreview({
  path,
  entry,
}: {
  /** URL 路径段，用于展示归属，如 ["characters", "林默"] */
  path: string[];
  entry: MemoryItem | null;
}) {
  const kind = path.length === 2 ? path[0] : null;

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-white">
      <div className="flex h-9 shrink-0 items-center gap-2 px-6">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Memory{kind ? ` · ${kind}` : ""}
        </span>
      </div>

      {entry === null ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="max-w-[420px] text-center">
            <p className="text-sm text-zinc-500">这条记忆还没有内容。</p>
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              记忆文件由「构建小说 memory」的 skill 生成，界面只读。
              文件不存在时，侧栏里的计数也会是 0。
            </p>
          </div>
        </div>
      ) : (
        <article className="min-h-0 flex-1 overflow-y-auto px-6 pb-8">
          <h1 className="mt-1 text-lg font-semibold tracking-tight">
            {entry.title}
          </h1>
          <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-7 text-zinc-700">
            {entry.content}
          </pre>
        </article>
      )}
    </main>
  );
}
