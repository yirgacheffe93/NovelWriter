import { useRef } from "react";

interface SidebarResizeHandleProps {
  /** 拖动起始基准：当前侧栏宽度（pointerdown 时快照） */
  width: number;
  min: number;
  max: number;
  onWidthChange: (width: number) => void;
}

/**
 * 侧栏右侧边缘的拖动把手（6px，覆盖在 border 上，hover/拖动时显形）。
 * setPointerCapture 保证拖出把手仍持续收到 move；宽度 = 起始快照 + 累计位移，实时 clamp。
 */
export default function SidebarResizeHandle({
  width,
  min,
  max,
  onWidthChange,
}: SidebarResizeHandleProps) {
  // 非 null 即拖动中；pointerup/cancel 复位（capture 随事件自动释放）
  const startRef = useRef<{ width: number; x: number } | null>(null);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="拖动调整侧栏宽度"
      className="absolute -right-[3px] top-0 z-10 h-full w-[6px] cursor-col-resize hover:bg-zinc-300 active:bg-zinc-300"
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        startRef.current = { width, x: event.clientX };
      }}
      onPointerMove={(event) => {
        if (!startRef.current) return;
        const next =
          startRef.current.width + (event.clientX - startRef.current.x);
        onWidthChange(Math.min(max, Math.max(min, next)));
      }}
      onPointerUp={() => {
        startRef.current = null;
      }}
      onPointerCancel={() => {
        startRef.current = null;
      }}
    />
  );
}
