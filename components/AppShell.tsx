"use client";

import { useEffect, useRef, useState } from "react";
import AgentPanel from "./AgentPanel";
import ChapterEditor from "./ChapterEditor";
import ChapterSidebar from "./ChapterSidebar";
import ProjectSidebar from "./ProjectSidebar";
import TopBar from "./TopBar";
import {
  createMessage,
  decideWriteMode,
  mockGenerate,
  type WriteMode,
} from "@/lib/agent-mock";
import { mockMessages } from "@/lib/mock-data";
import type { AgentRunStatus, Chapter, ChatMessage, Project } from "@/lib/types";

interface AppShellProps {
  projects: Project[];
  chapters: Chapter[];
  initialChapterContent: string;
  currentProject: Project;
  currentChapter: Chapter;
}

const GENERATE_DELAY_MS = 900;

export default function AppShell({
  projects,
  chapters,
  initialChapterContent,
  currentProject,
  currentChapter,
}: AppShellProps) {
  const [projectSidebarCollapsed, setProjectSidebarCollapsed] = useState(false);
  const [chapterSidebarCollapsed, setChapterSidebarCollapsed] = useState(false);
  const [agentPanelCollapsed, setAgentPanelCollapsed] = useState(false);

  const [chapterContent, setChapterContent] = useState(initialChapterContent);
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [agentStatus, setAgentStatus] = useState<AgentRunStatus | null>(null);

  // 事件处理器（含 setTimeout 回调）需要读到最新正文，state 闭包会过期
  const contentRef = useRef(chapterContent);
  useEffect(() => {
    contentRef.current = chapterContent;
  }, [chapterContent]);

  // 最近一次生成写入前的正文快照
  const undoSnapshotRef = useRef<string | null>(null);
  // 最近一次生成写入后的正文，用来判断「用户写入后是否又编辑过」
  const lastWrittenRef = useRef<string | null>(null);

  const timersRef = useRef<number[]>([]);
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  function applyGeneration(output: string, mode: WriteMode) {
    const before = contentRef.current;
    const next = mode === "append" && before ? `${before}\n\n${output}` : output;

    undoSnapshotRef.current = before;
    lastWrittenRef.current = next;
    setChapterContent(next);
  }

  /**
   * 撤销一次生成写入。程序化改写 value 会清空浏览器原生 undo 栈，
   * 所以这里自己接管；返回 false 时交给原生 undo（用户自己的编辑）。
   */
  function handleUndo(): boolean {
    const snapshot = undoSnapshotRef.current;
    if (snapshot === null || contentRef.current !== lastWrittenRef.current) {
      return false;
    }
    setChapterContent(snapshot);
    undoSnapshotRef.current = null;
    lastWrittenRef.current = null;
    return true;
  }

  function handleSend(instruction: string) {
    setMessages((prev) => [...prev, createMessage("user", instruction)]);
    setAgentStatus("pending");

    timersRef.current.push(
      window.setTimeout(() => setAgentStatus("running"), 250),
      window.setTimeout(() => {
        const output = mockGenerate(instruction);
        applyGeneration(output, decideWriteMode(instruction));
        setMessages((prev) => [
          ...prev,
          createMessage("agent", output, "applied"),
        ]);
        setAgentStatus(null);
      }, GENERATE_DELAY_MS),
    );
  }

  return (
    <div className="flex h-full flex-col bg-white text-zinc-900">
      <TopBar projectName={currentProject.name} />

      <div className="flex min-h-0 flex-1">
        <ProjectSidebar
          projects={projects}
          currentProjectId={currentProject.id}
          collapsed={projectSidebarCollapsed}
          onToggle={() => setProjectSidebarCollapsed((value) => !value)}
        />

        <ChapterSidebar
          projectName={currentProject.name}
          chapters={chapters}
          currentChapterId={currentChapter.id}
          collapsed={chapterSidebarCollapsed}
          onToggle={() => setChapterSidebarCollapsed((value) => !value)}
        />

        <ChapterEditor
          chapter={currentChapter}
          content={chapterContent}
          onChange={setChapterContent}
          onUndo={handleUndo}
        />

        <AgentPanel
          collapsed={agentPanelCollapsed}
          onToggle={() => setAgentPanelCollapsed((value) => !value)}
          messages={messages}
          status={agentStatus}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
