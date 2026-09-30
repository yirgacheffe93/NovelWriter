/**
 * URL 载体：/projects/:projectId/memory/[...path]。
 * 界面由 [projectId]/layout.tsx 里的 AppShell 渲染。
 * 未知路径不做 notFound：AppShell 不渲染 children，not-found 边界对用户
 * 不可见，交由 AppShell 落入空态即可。
 */
export default function MemoryPage() {
  return null;
}
