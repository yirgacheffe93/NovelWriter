import {
  SAVE_STATE_CLASS,
  SAVE_STATE_TEXT,
  type SaveState,
} from "@/features/workspace/save-state";

interface TopBarProps {
  projectName: string;
  saveState: SaveState;
  archived?: boolean;
}

export default function TopBar({
  projectName,
  saveState,
  archived = false,
}: TopBarProps) {
  return (
    <header className="flex h-11 shrink-0 items-center gap-4 border-b border-zinc-200 bg-white px-4">
      <span className="text-sm font-semibold tracking-tight">Novel Agent</span>
      <span className="text-sm text-zinc-400">{projectName}</span>
      {archived && (
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
          已归档
        </span>
      )}

      <div className="ml-auto flex items-center gap-4 text-xs">
        <span className={SAVE_STATE_CLASS[saveState]}>
          {SAVE_STATE_TEXT[saveState]}
        </span>
      </div>
    </header>
  );
}
