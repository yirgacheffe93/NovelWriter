"use client";

import { useRef, useState } from "react";

interface NewProjectDialogProps {
  /** 只回传用户填写的文本，实体创建与状态变更由 AppShell 负责 */
  onCreate: (name: string, description: string) => void;
  /** 拖入/选择 .txt 文件即导入（新建同名项目并拆分章节），状态变更由调用方负责 */
  onImport: (file: File) => void;
  onClose: () => void;
}

export default function NewProjectDialog({
  onCreate,
  onImport,
  onClose,
}: NewProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSubmit = name.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    onCreate(name.trim(), description.trim());
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file && file.name.toLowerCase().endsWith(".txt")) {
      onImport(file);
    }
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
        aria-label="新建项目"
        className="w-full max-w-[420px] rounded-lg border border-zinc-200 bg-white p-5 shadow-xl"
      >
        <h2 className="text-sm font-semibold tracking-tight">新建项目</h2>

        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">书名</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：长夜余火"
              className="rounded border border-zinc-200 px-2.5 py-1.5 text-sm outline-none placeholder:text-zinc-300 focus:border-zinc-400"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">简介（可选）</span>
            <textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="一句话介绍这本小说"
              className="resize-none rounded border border-zinc-200 px-2.5 py-1.5 text-sm leading-6 outline-none placeholder:text-zinc-300 focus:border-zinc-400"
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

        <div className="mt-4 flex items-center gap-3 text-[11px] text-zinc-300">
          <span className="h-px flex-1 bg-zinc-100" />
          或从 txt 导入
          <span className="h-px flex-1 bg-zinc-100" />
        </div>

        {/* 拖拽/点击导入区：拖入 .txt 即导入，点击打开文件选择 */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            handleFiles(event.dataTransfer.files);
          }}
          className={`mt-3 flex cursor-pointer flex-col items-center gap-1 rounded border border-dashed px-3 py-4 text-center transition-colors ${
            dragOver
              ? "border-zinc-400 bg-zinc-50"
              : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50"
          }`}
        >
          <span className="text-xs text-zinc-500">拖入 .txt 小说文件</span>
          <span className="text-[11px] text-zinc-400">
            将新建同名项目，并按章节标题自动拆分
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={(event) => {
              handleFiles(event.target.files);
              // 允许重新选择同一文件
              event.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}
