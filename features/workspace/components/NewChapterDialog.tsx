"use client";

import { useState } from "react";

interface NewChapterDialogProps {
  /** 只回传标题文本，实体创建与状态变更由 AppShell 负责 */
  onCreate: (title: string) => void;
  onClose: () => void;
}

export default function NewChapterDialog({
  onCreate,
  onClose,
}: NewChapterDialogProps) {
  const [title, setTitle] = useState("");
  const canSubmit = title.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    onCreate(title.trim());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/20 p-4"
      onClick={(event) => {
        // 只在点击遮罩本身时关闭，点击卡片内部不关
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        // 焦点在表单控件内，keydown 会冒泡到这里
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="新建章节"
        className="w-full max-w-[420px] rounded-lg border border-zinc-200 bg-white p-5 shadow-xl"
      >
        <h2 className="text-sm font-semibold tracking-tight">新建章节</h2>

        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">章节标题</span>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：灰土"
              className="rounded border border-zinc-200 px-2.5 py-1.5 text-sm outline-none placeholder:text-zinc-300 focus:border-zinc-400"
            />
          </label>

          <div className="mt-1 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-300"
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
