interface EditorEmptyStateProps {
  /** 项目里是否已有章节：决定「未创建」还是「未选择」文案 */
  hasChapters: boolean;
  onCreateChapter: () => void;
}

export default function EditorEmptyState({
  hasChapters,
  onCreateChapter,
}: EditorEmptyStateProps) {
  if (hasChapters) {
    return (
      <main className="flex min-w-0 flex-1 items-center justify-center bg-white">
        <p className="text-sm text-zinc-400">
          Select a chapter to start writing.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 bg-white">
      <p className="text-sm text-zinc-400">This novel has no chapters.</p>
      <button
        type="button"
        onClick={onCreateChapter}
        className="rounded border border-dashed border-zinc-300 px-2 py-1 text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
      >
        Create Chapter
      </button>
    </main>
  );
}
