import { ArrowUp, PanelRightClose, PanelRightOpen } from "lucide-react";

interface AgentPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function AgentPanel({ collapsed, onToggle }: AgentPanelProps) {
  if (collapsed) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center border-l border-zinc-200 bg-zinc-50 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label="展开 Agent 面板"
          className="text-zinc-400 transition-colors hover:text-zinc-900"
        >
          <PanelRightOpen size={17} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l border-zinc-200 bg-zinc-50">
      <div className="flex h-9 shrink-0 items-center gap-2 px-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Agent
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-label="折叠 Agent 面板"
          className="ml-auto text-zinc-400 transition-colors hover:text-zinc-900"
        >
          <PanelRightClose size={15} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <p className="mt-2 text-xs leading-5 text-zinc-400">
          Agent 尚未接入，暂不能发送指令。
        </p>
      </div>

      {/* composer 保留外壳但整体禁用：明确标注而非删除，接入真实模型时少返工 */}
      <div className="shrink-0 border-t border-zinc-200 p-3">
        <div className="rounded border border-zinc-200 bg-white">
          <textarea
            rows={2}
            disabled
            placeholder="Agent 尚未接入"
            className="w-full resize-none bg-transparent px-2.5 py-2 text-sm leading-6 outline-none placeholder:text-zinc-300"
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-[11px] text-zinc-400">接入真实模型后可用</span>
            <button
              type="button"
              disabled
              aria-label="发送"
              className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-300"
            >
              <ArrowUp size={14} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
