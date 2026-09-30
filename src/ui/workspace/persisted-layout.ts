/**
 * 侧栏布局状态（宽度与折叠），存在 localStorage。
 *
 * 组件内 state 撑不住：切项目会让 [projectId] 段下的组件重挂载（见 AppShell
 * 的会话注释），状态退回默认值——刚折叠的分组又展开、刚拖好的宽度又回默认。
 *
 * 用 useSyncExternalStore 而非「useEffect 里 setState」：后者多渲染一轮，且被
 * react-hooks/set-state-in-effect 拦下。server snapshot 固定为默认值，因此服务端
 * 渲染与 hydration 一致，读存储只发生在客户端。
 *
 * 订阅是模块级共享的：任一值变化只通知一次，各 hook 重新读取自己的键；快照未变的
 * 组件由 React 跳过重渲染，所以拖动某个侧栏不会带动其它侧栏重渲染。
 */
import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function write(key: string, value: string): void {
  window.localStorage.setItem(key, value);
  for (const listener of listeners) listener();
}

/** 折叠状态：存 "1"/"0"，返回当前值与切换函数。 */
export function usePersistedToggle(
  key: string,
  fallback = false,
): [boolean, () => void] {
  const collapsed = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(key) === "1",
    () => fallback,
  );

  const toggle = useCallback(() => {
    window.localStorage.setItem(key, collapsed ? "0" : "1");
    for (const listener of listeners) listener();
  }, [key, collapsed]);

  return [collapsed, toggle];
}

/** 数值状态（侧栏宽度）：解析失败或未存过时用 fallback。 */
export function usePersistedNumber(
  key: string,
  fallback: number,
): [number, (next: number) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : fallback;
    },
    () => fallback,
  );

  const set = useCallback((next: number) => write(key, String(next)), [key]);

  return [value, set];
}
