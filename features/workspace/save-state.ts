/** 保存状态机：TopBar 与编辑器 footer 共用同一份文案与颜色。 */
export type SaveState = "clean" | "dirty" | "saving" | "error";

export const SAVE_STATE_TEXT: Record<SaveState, string> = {
  clean: "已保存",
  dirty: "未保存",
  saving: "保存中…",
  error: "保存失败",
};

export const SAVE_STATE_CLASS: Record<SaveState, string> = {
  clean: "text-zinc-400",
  dirty: "text-amber-600",
  saving: "text-zinc-400",
  error: "text-red-600",
};

export interface SaveSessionShape {
  content: string;
  savedContent: string;
  status: "idle" | "saving" | "error";
}

/** 单一派生规则：error 优先（粘性）→ saving → dirty → clean。 */
export function deriveSaveState(
  session: SaveSessionShape | undefined,
): SaveState {
  if (!session) return "clean";
  if (session.status === "error") return "error";
  if (session.status === "saving") return "saving";
  if (session.content !== session.savedContent) return "dirty";
  return "clean";
}
