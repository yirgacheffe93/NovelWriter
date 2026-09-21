/**
 * URL 载体：/projects/:projectId/chapters/:chapterId（web-ui.md §25）。
 * 界面由 [projectId]/layout.tsx 里的 AppShell 渲染。
 * 未知 chapterId 不做 notFound：AppShell 不渲染 children，not-found 边界
 * 对用户不可见，交由 AppShell 落入「选择章节」空态即可。
 */
export default function ChapterPage() {
  return null;
}
