"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NewProjectDialog from "./NewProjectDialog";
import { createProjectAction, importNovelAction } from "@/features/workspace/actions";

/** 无任何小说时的空态页（web-ui.md §21）。 */
export default function EmptyWorkspace() {
  const router = useRouter();
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);

  async function handleCreate(name: string, description: string) {
    try {
      const project = await createProjectAction(name, description);
      // push 会卸载本页（含弹窗），无需手动关闭
      router.push(`/projects/${project.id}`);
    } catch (error) {
      // 原型阶段不做错误 UI：弹窗保持打开，用户可重试或取消
      console.error("创建项目失败", error);
    }
  }

  async function handleImport(file: File) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const imported = await importNovelAction(formData);
      // push 会卸载本页（含弹窗），无需手动关闭
      router.push(
        `/projects/${imported.project.id}/chapters/${imported.items[0].chapter.id}`,
      );
    } catch (error) {
      // 原型阶段不做错误 UI：弹窗保持打开，用户可重试或取消
      console.error("导入小说失败", error);
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 bg-white text-zinc-900">
      <p className="text-sm font-medium text-zinc-700">No novels yet.</p>
      <p className="text-xs text-zinc-400">Create or import your first novel.</p>
      <button
        type="button"
        onClick={() => setShowNewProjectDialog(true)}
        className="mt-2 rounded border border-dashed border-zinc-300 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
      >
        New Project
      </button>

      {showNewProjectDialog && (
        <NewProjectDialog
          onCreate={handleCreate}
          onImport={handleImport}
          onClose={() => setShowNewProjectDialog(false)}
        />
      )}
    </div>
  );
}
