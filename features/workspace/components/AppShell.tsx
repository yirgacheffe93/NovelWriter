"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AgentPanel from "./AgentPanel";
import ChapterEditor from "./ChapterEditor";
import ChapterSidebar from "./ChapterSidebar";
import ConfirmDialog from "./ConfirmDialog";
import EditorEmptyState from "./EditorEmptyState";
import NewChapterDialog from "./NewChapterDialog";
import NewProjectDialog from "./NewProjectDialog";
import ProjectSidebar from "./ProjectSidebar";
import RenameDialog from "./RenameDialog";
import TopBar from "./TopBar";
import {
  archiveProjectAction,
  createChapterAction,
  createProjectAction,
  deleteChapterAction,
  importNovelAction,
  renameChapterAction,
  renameProjectAction,
  restoreProjectAction,
  saveChapterContentAction,
} from "@/features/workspace/actions";
import { deriveSaveState } from "@/features/workspace/save-state";
import type { ChapterMetadata, Project } from "@/features/workspace/types";

interface AppShellProps {
  /** 当前项目：由 [projectId]/layout 校验后传入，非空 */
  project: Project;
  /** 项目列表初值：仅用于初始化 state（重命名/归档/恢复在本地维护） */
  projects: Project[];
  /** 章节列表初值：仅用于初始化 state（新建/删除/重命名在本地维护） */
  chapters: ChapterMetadata[];
  /** 各章节的磁盘正文初始快照（SoT 是 .md 文件），仅初始化时消费 */
  baselineContents: Record<string, string>;
}

/** 一个章节的编辑会话：正文草稿 + 最近保存基线 + 已知 revision + 保存状态 */
interface ChapterSession {
  content: string;
  savedContent: string;
  revision: number;
  status: "idle" | "saving" | "error";
}

type DialogState =
  | { kind: "newProject" }
  | { kind: "newChapter" }
  | { kind: "renameChapter"; chapter: ChapterMetadata }
  | { kind: "deleteChapter"; chapter: ChapterMetadata }
  | { kind: "renameProject"; project: Project }
  | { kind: "archiveProject"; project: Project };

const SAVE_DEBOUNCE_MS = 800;

export default function AppShell({
  project,
  projects: initialProjects,
  chapters: initialChapters,
  baselineContents,
}: AppShellProps) {
  const router = useRouter();
  // 布局里的 useParams 返回全部动态参数（含子段 chapterId），URL 即状态（§25）
  const { chapterId } = useParams<{ projectId: string; chapterId?: string }>();
  const currentChapterId = chapterId ?? null;

  const [projectSidebarCollapsed, setProjectSidebarCollapsed] = useState(false);
  const [chapterSidebarCollapsed, setChapterSidebarCollapsed] = useState(false);
  const [agentPanelCollapsed, setAgentPanelCollapsed] = useState(false);

  const [projects, setProjects] = useState(initialProjects);
  const [chapters, setChapters] = useState(initialChapters);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  // 会话覆盖层：只维护当前项目的章节（切项目会重挂载本组件，天然按项目隔离）
  const [sessions, setSessions] = useState<Record<string, ChapterSession>>(
    () => {
      const initial: Record<string, ChapterSession> = {};
      for (const chapter of initialChapters) {
        if (chapter.projectId !== project.id) continue;
        const content = baselineContents[chapter.id] ?? "";
        initial[chapter.id] = {
          content,
          savedContent: content,
          revision: chapter.revision,
          status: "idle",
        };
      }
      return initial;
    },
  );
  // 定时器与串行队列回调需要读到最新会话：先写 ref 再 setState，避免闭包过期
  const sessionsRef = useRef(sessions);
  const applySessions = useCallback((next: Record<string, ChapterSession>) => {
    sessionsRef.current = next;
    setSessions(next);
  }, []);

  const timersRef = useRef(new Map<string, number>());
  const queuesRef = useRef(new Map<string, Promise<void>>());

  const currentProject =
    projects.find((item) => item.id === project.id) ?? project;
  const projectChapters = chapters
    .filter((chapter) => chapter.projectId === project.id)
    // filter 已返回新数组，就地排序安全；UI 按 index 升序（web-ui.md §8.2）
    .sort((a, b) => a.index - b.index);
  const currentChapter =
    projectChapters.find((chapter) => chapter.id === currentChapterId) ?? null;
  const currentSession = currentChapter
    ? sessions[currentChapter.id]
    : undefined;
  const saveState = deriveSaveState(currentSession);

  const runSave = useCallback(
    async (chapterId: string) => {
      const session = sessionsRef.current[chapterId];
      // 一条 early return 同时覆盖「章节已删除」与「已收敛」
      if (!session || session.content === session.savedContent) return;
      const snapshot = session.content;

      applySessions({
        ...sessionsRef.current,
        [chapterId]: { ...session, status: "saving" },
      });
      try {
        const updated = await saveChapterContentAction(
          chapterId,
          snapshot,
          session.revision,
        );
        const current = sessionsRef.current[chapterId];
        if (!current) return; // 章节在保存期间被删除
        applySessions({
          ...sessionsRef.current,
          [chapterId]: {
            ...current,
            savedContent: snapshot,
            revision: updated.revision,
            status: "idle",
          },
        });
        // 只 merge 保存相关字段，避免窄竞争覆盖重命名的 title
        setChapters((prev) =>
          prev.map((chapter) =>
            chapter.id === chapterId
              ? {
                  ...chapter,
                  revision: updated.revision,
                  wordCount: updated.wordCount,
                  contentHash: updated.contentHash,
                  updatedAt: updated.updatedAt,
                }
              : chapter,
          ),
        );
      } catch (error) {
        // error 粘性：继续输入不翻回「未保存」，下次输入重试成功才清除。
        // 真实冲突（多端写入）的 reload/merge 留给 Phase 4。
        const current = sessionsRef.current[chapterId];
        if (!current) return;
        applySessions({
          ...sessionsRef.current,
          [chapterId]: { ...current, status: "error" },
        });
        console.error("保存章节失败", error);
      }
    },
    [applySessions],
  );

  const enqueue = useCallback(
    (chapterId: string) => {
      // per-chapter promise 链：串行化保存，第二笔天然拿到第一笔返回的新 revision
      const previous = queuesRef.current.get(chapterId) ?? Promise.resolve();
      const next = previous.catch(() => {}).then(() => runSave(chapterId));
      queuesRef.current.set(chapterId, next);
    },
    [runSave],
  );

  const schedule = useCallback(
    (chapterId: string) => {
      const existing = timersRef.current.get(chapterId);
      if (existing !== undefined) window.clearTimeout(existing);
      const timer = window.setTimeout(() => {
        timersRef.current.delete(chapterId);
        enqueue(chapterId);
      }, SAVE_DEBOUNCE_MS);
      timersRef.current.set(chapterId, timer);
    },
    [enqueue],
  );

  const flushPending = useCallback(() => {
    for (const [chapterId, timer] of timersRef.current) {
      window.clearTimeout(timer);
      enqueue(chapterId);
    }
    timersRef.current.clear();
  }, [enqueue]);

  // 切章节时立即保存上一章的待写内容；挂载时无定时器，天然 no-op
  useEffect(() => {
    flushPending();
  }, [currentChapterId, flushPending]);

  // 页面隐藏（切标签页/合盖）与卸载（切项目）时 flush；
  // 硬刷新/关标签页仍可能丢最后 800ms 输入，属已知边界（见 README）
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushPending();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flushPending();
    };
  }, [flushPending]);

  function handleChange(value: string) {
    if (!currentChapter) return;
    const session = sessionsRef.current[currentChapter.id];
    if (!session) return;
    applySessions({
      ...sessionsRef.current,
      [currentChapter.id]: { ...session, content: value },
    });
    schedule(currentChapter.id);
  }

  async function handleCreateProject(name: string, description: string) {
    try {
      const created = await createProjectAction(name, description);
      // 不更新本地 projects：切换项目段必然重挂载 AppShell，props 即最新
      setDialog(null);
      router.push(`/projects/${created.id}`);
    } catch (error) {
      // 原型阶段不做错误 UI：弹窗保持打开，用户可重试或取消
      console.error("创建项目失败", error);
    }
  }

  async function handleCreateChapter(title: string) {
    try {
      const chapter = await createChapterAction(project.id, title);

      setChapters((prev) => [...prev, chapter]);
      applySessions({
        ...sessionsRef.current,
        [chapter.id]: {
          content: "",
          savedContent: "",
          revision: chapter.revision,
          status: "idle",
        },
      });
      setDialog(null);
      router.push(`/projects/${project.id}/chapters/${chapter.id}`);
    } catch (error) {
      // 原型阶段不做错误 UI：弹窗保持打开，用户可重试或取消
      console.error("创建章节失败", error);
    }
  }

  async function handleImportNovel(file: File) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const imported = await importNovelAction(formData);

      // 本地状态补齐导入结果：切项目时布局若未重挂载，侧栏/会话仍需立即正确
      const importedChapters = imported.items.map((item) => item.chapter);
      setProjects((prev) => [...prev, imported.project]);
      setChapters((prev) => [...prev, ...importedChapters]);
      const next = { ...sessionsRef.current };
      for (const { chapter, content } of imported.items) {
        next[chapter.id] = {
          content,
          savedContent: content,
          revision: chapter.revision,
          status: "idle",
        };
      }
      applySessions(next);
      setDialog(null);
      router.push(
        `/projects/${imported.project.id}/chapters/${importedChapters[0].id}`,
      );
    } catch (error) {
      // 原型阶段不做错误 UI：弹窗保持打开，用户可重试或取消
      console.error("导入小说失败", error);
    }
  }

  async function handleRenameChapter(title: string) {
    if (dialog?.kind !== "renameChapter") return;
    try {
      const updated = await renameChapterAction(dialog.chapter.id, title);
      setChapters((prev) =>
        prev.map((chapter) =>
          chapter.id === updated.id
            ? { ...chapter, title: updated.title, updatedAt: updated.updatedAt }
            : chapter,
        ),
      );
      setDialog(null);
    } catch (error) {
      console.error("重命名章节失败", error);
    }
  }

  async function handleDeleteChapter() {
    if (dialog?.kind !== "deleteChapter") return;
    const chapter = dialog.chapter;
    try {
      await deleteChapterAction(chapter.id);

      // 先清理本地状态再导航：flush effect 依赖 currentChapterId 变化触发
      const timer = timersRef.current.get(chapter.id);
      if (timer !== undefined) window.clearTimeout(timer);
      timersRef.current.delete(chapter.id);
      queuesRef.current.delete(chapter.id);
      const rest = { ...sessionsRef.current };
      delete rest[chapter.id];
      applySessions(rest);
      setChapters((prev) => prev.filter((item) => item.id !== chapter.id));
      setDialog(null);

      if (currentChapterId === chapter.id) {
        router.push(`/projects/${project.id}`);
      }
    } catch (error) {
      console.error("删除章节失败", error);
    }
  }

  async function handleRenameProject(name: string) {
    if (dialog?.kind !== "renameProject") return;
    try {
      const updated = await renameProjectAction(dialog.project.id, name);
      setProjects((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setDialog(null);
    } catch (error) {
      console.error("重命名项目失败", error);
    }
  }

  async function handleArchiveProject() {
    if (dialog?.kind !== "archiveProject") return;
    try {
      const updated = await archiveProjectAction(dialog.project.id);
      // 原地停留：侧栏「已归档」分组自动接管当前项，恢复按钮就在手边
      setProjects((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setDialog(null);
    } catch (error) {
      console.error("归档项目失败", error);
    }
  }

  async function handleRestoreProject(target: Project) {
    try {
      const updated = await restoreProjectAction(target.id);
      setProjects((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (error) {
      console.error("恢复项目失败", error);
    }
  }

  return (
    <div className="flex h-full flex-col bg-white text-zinc-900">
      <TopBar
        projectName={currentProject.name}
        saveState={saveState}
        archived={currentProject.status === "archived"}
      />

      <div className="flex min-h-0 flex-1">
        <ProjectSidebar
          projects={projects}
          chapters={chapters}
          currentProjectId={project.id}
          collapsed={projectSidebarCollapsed}
          onToggle={() => setProjectSidebarCollapsed((value) => !value)}
          onNewProject={() => setDialog({ kind: "newProject" })}
          onRenameProject={(target) =>
            setDialog({ kind: "renameProject", project: target })
          }
          onArchiveProject={(target) =>
            setDialog({ kind: "archiveProject", project: target })
          }
          onRestoreProject={handleRestoreProject}
        />

        <ChapterSidebar
          projectId={project.id}
          projectName={currentProject.name}
          chapters={projectChapters}
          currentChapterId={currentChapterId}
          collapsed={chapterSidebarCollapsed}
          onToggle={() => setChapterSidebarCollapsed((value) => !value)}
          onNewChapter={() => setDialog({ kind: "newChapter" })}
          onRenameChapter={(chapter) =>
            setDialog({ kind: "renameChapter", chapter })
          }
          onDeleteChapter={(chapter) =>
            setDialog({ kind: "deleteChapter", chapter })
          }
        />

        {currentChapter ? (
          // key 强制每章重建 textarea，浏览器原生 undo 栈不跨章串用
          <ChapterEditor
            key={currentChapter.id}
            chapter={currentChapter}
            content={currentSession?.content ?? ""}
            onChange={handleChange}
            saveState={saveState}
          />
        ) : (
          <EditorEmptyState
            hasChapters={projectChapters.length > 0}
            onCreateChapter={() => setDialog({ kind: "newChapter" })}
          />
        )}

        <AgentPanel
          collapsed={agentPanelCollapsed}
          onToggle={() => setAgentPanelCollapsed((value) => !value)}
        />
      </div>

      {dialog?.kind === "newProject" && (
        <NewProjectDialog
          onCreate={handleCreateProject}
          onImport={handleImportNovel}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === "newChapter" && (
        <NewChapterDialog
          onCreate={handleCreateChapter}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === "renameChapter" && (
        <RenameDialog
          heading="重命名章节"
          label="章节标题"
          initialValue={dialog.chapter.title}
          onConfirm={handleRenameChapter}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === "deleteChapter" && (
        <ConfirmDialog
          heading="删除章节"
          description={`将删除「${dialog.chapter.title}」及其正文文件，此操作不可撤销。`}
          confirmLabel="删除"
          danger
          onConfirm={handleDeleteChapter}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === "renameProject" && (
        <RenameDialog
          heading="重命名项目"
          label="书名"
          initialValue={dialog.project.name}
          onConfirm={handleRenameProject}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === "archiveProject" && (
        <ConfirmDialog
          heading="归档项目"
          description={`「${dialog.project.name}」将从默认列表隐藏，可随时从「已归档」分组恢复。`}
          confirmLabel="归档"
          onConfirm={handleArchiveProject}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
