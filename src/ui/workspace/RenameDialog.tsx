"use client";

import { useState } from "react";

interface RenameDialogProps {
  heading: string;
  label: string;
  initialValue: string;
  submitLabel?: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

export default function RenameDialog({
  heading,
  label,
  initialValue,
  submitLabel = "保存",
  onConfirm,
  onClose,
}: RenameDialogProps) {
  const [value, setValue] = useState(initialValue);
  const canSubmit = value.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    onConfirm(value.trim());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/20 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        className="w-full max-w-[420px] rounded-lg border border-zinc-200 bg-white p-5 shadow-xl"
      >
        <h2 className="text-sm font-semibold tracking-tight">{heading}</h2>

        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">{label}</span>
            <input
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
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
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
