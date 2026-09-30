/**
 * 项目记忆的**纯类型与纯函数**。
 *
 * 这里不 import 任何 `node:` 模块，因此客户端组件可以安全引用（见
 * docs/architecture/structure.md §3：ui/ 只能 import 纯类型与纯函数）。
 * 真正读文件的是 memory-store.ts，那个模块只给服务端用。
 *
 * 目录约定（未来由「构建小说 memory」的 skill 写入，见
 * docs/architecture/data-model/overview.md §9）：
 *
 * ```text
 * memory/
 * ├── timeline.md            时间线：单文件，按事件先后
 * ├── characters/<名字>.md   人物
 * ├── places/<名字>.md       地点
 * ├── items/<名字>.md        重要物品
 * └── creatures/<名字>.md    非人类生物
 * ```
 */

/** 分类目录；时间线是单文件，不在此列。 */
export const MEMORY_KINDS = [
  "characters",
  "places",
  "items",
  "creatures",
] as const;

export type MemoryKind = (typeof MEMORY_KINDS)[number];

/** 分类的中文名，给侧栏用。 */
export const MEMORY_KIND_LABELS: Record<MemoryKind, string> = {
  characters: "人物",
  places: "地点",
  items: "重要物品",
  creatures: "非人类生物",
};

export interface MemoryItem {
  /** URL 路径段：["timeline"] 或 [kind, name] */
  path: string[];
  title: string;
  content: string;
}

export interface MemoryGroup {
  kind: MemoryKind;
  label: string;
  items: MemoryItem[];
}

export interface ProjectMemory {
  /** 时间线单文件；不存在时为 null */
  timeline: MemoryItem | null;
  groups: MemoryGroup[];
}

export function isMemoryKind(value: string): value is MemoryKind {
  return (MEMORY_KINDS as readonly string[]).includes(value);
}

/** 路径段是否是合法的记忆路径形状（用于区分"未命中"与"不是记忆路由"）。 */
export function isMemoryPath(segments: string[] | undefined): boolean {
  if (!segments || segments.length === 0) return false;
  if (segments.length === 1) return segments[0] === "timeline";
  return segments.length === 2 && isMemoryKind(segments[0]);
}

/** URL 路径段 → 记忆条目；未命中返回 null。 */
export function findMemoryItem(
  memory: ProjectMemory,
  segments: string[] | undefined,
): MemoryItem | null {
  if (!segments || segments.length === 0) return null;
  if (segments.length === 1 && segments[0] === "timeline") {
    return memory.timeline;
  }
  if (segments.length === 2) {
    const [kind, name] = segments;
    const group = memory.groups.find((item) => item.kind === kind);
    return group?.items.find((item) => item.title === name) ?? null;
  }
  return null;
}
