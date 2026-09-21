"use client";

interface ConfirmDialogProps {
  heading: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  heading,
  description,
  confirmLabel,
  danger = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
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
        <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded px-3 py-1.5 text-sm text-white transition-colors ${
              danger
                ? "bg-red-600 hover:bg-red-500"
                : "bg-zinc-900 hover:bg-zinc-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
