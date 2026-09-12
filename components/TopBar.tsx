import { Settings } from "lucide-react";

interface TopBarProps {
  projectName: string;
}

export default function TopBar({ projectName }: TopBarProps) {
  return (
    <header className="flex h-11 shrink-0 items-center gap-4 border-b border-zinc-200 bg-white px-4">
      <span className="text-sm font-semibold tracking-tight">Novel Agent</span>
      <span className="text-sm text-zinc-400">{projectName}</span>

      <div className="ml-auto flex items-center gap-4 text-xs text-zinc-500">
        <span>Saved</span>
        <button
          type="button"
          aria-label="Settings"
          className="text-zinc-400 transition-colors hover:text-zinc-900"
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
}
