/**
 * 项目记忆的**只读**读取。仅服务端可用（依赖 node:fs）。
 *
 * 目录约定与类型见 memory.ts；那个模块是纯的，客户端可以直接引用。
 * 本模块只做一件事：按约定把磁盘上的记忆读成内存结构。
 *
 * 一次读全部内容：记忆文件都很短，与章节正文的 baselineContents 同一取舍，
 * 换来界面无需异步加载态。
 */
import fs from "node:fs";
import path from "node:path";
import { getProject } from "./project-repository";
import { resolveDataPath } from "../storage/paths";
import {
  MEMORY_KINDS,
  MEMORY_KIND_LABELS,
  type MemoryItem,
  type ProjectMemory,
} from "./memory";

/** 实体名来自文件名；只接受不含路径分隔符的单段名。 */
function isSafeName(value: string): boolean {
  return (
    value.length > 0 &&
    value !== "." &&
    value !== ".." &&
    !value.includes("/") &&
    !value.includes("\\") &&
    !value.includes("\0")
  );
}

/** 读取文件；不存在或不可读时返回 null，界面据此落入空态。 */
function readIfExists(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

/** 列出分类目录下的实体名（去掉 .md 后缀）并排序。目录不存在即空列表。 */
function listEntities(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((item) => item.isFile() && item.name.endsWith(".md"))
      .map((item) => item.name.slice(0, -3))
      .filter(isSafeName)
      .sort((a, b) => a.localeCompare(b, "zh"));
  } catch {
    return [];
  }
}

export function readProjectMemory(projectId: string): ProjectMemory {
  const project = getProject(projectId);
  if (!project) {
    return {
      timeline: null,
      groups: MEMORY_KINDS.map((kind) => ({
        kind,
        label: MEMORY_KIND_LABELS[kind],
        items: [],
      })),
    };
  }

  const root = path.join(resolveDataPath(project.rootPath), "memory");
  const timelineContent = readIfExists(path.join(root, "timeline.md"));
  const timeline: MemoryItem | null =
    timelineContent === null
      ? null
      : { path: ["timeline"], title: "时间线", content: timelineContent };

  return {
    timeline,
    groups: MEMORY_KINDS.map((kind) => ({
      kind,
      label: MEMORY_KIND_LABELS[kind],
      items: listEntities(path.join(root, kind)).map((name) => ({
        path: [kind, name],
        title: name,
        content: readIfExists(path.join(root, kind, `${name}.md`)) ?? "",
      })),
    })),
  };
}
