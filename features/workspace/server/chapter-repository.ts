/**
 * Chapter 持久化：SQLite 元数据索引 + Markdown 正文文件。
 * 标题 SoT 在 SQLite（chapters.title），正文 SoT 在文件（overview §6.2）。
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { countWords } from "../word-count";
import type { ChapterMetadata } from "../types";
import { getDb } from "./db";

/** list / rename / save 三处 SELECT/RETURNING 共用的列清单。 */
const CHAPTER_COLUMNS =
  "id, project_id, chapter_index, title, file_path, status, word_count, revision, content_hash, created_at, updated_at";

interface ChapterRow {
  id: string;
  project_id: string;
  chapter_index: number;
  title: string;
  file_path: string;
  status: "draft" | "final";
  word_count: number;
  revision: number;
  content_hash: string;
  created_at: string;
  updated_at: string;
}

/**
 * 无参返回全部章节，是对 §26.1「List Chapters(projectId)」的有意偏离：
 * ProjectSidebar 的浮窗需要跨项目统计章节数/字数，项目内过滤由调用方完成。
 */
export function listChapters(): ChapterMetadata[] {
  const rows = getDb()
    .prepare(
      `SELECT ${CHAPTER_COLUMNS} FROM chapters ORDER BY project_id, chapter_index`,
    )
    .all() as unknown as ChapterRow[];
  return rows.map(toChapterMetadata);
}

/**
 * 创建章节（§26.1 Create Chapter：输入 projectId + title，服务端补全其余字段）。
 * 写入次序：先写空正文文件（正文 SoT），再 INSERT 元数据（索引）。
 * 不加显式事务：同步 API 无交错，UNIQUE(project_id, chapter_index) 兜底；
 * 文件写失败则库无记录可重试，INSERT 失败留下的空文件会被下次同 index 创建覆盖。
 */
export function createChapter(
  projectId: string,
  title: string,
): ChapterMetadata {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("章节标题不能为空");
  }

  // projectId 来自客户端，先查库拿 root_path、校验存在，再碰磁盘
  const project = getDb()
    .prepare("SELECT root_path FROM projects WHERE id = ?")
    .get(projectId) as unknown as { root_path: string } | undefined;
  if (!project) {
    throw new Error(`项目不存在：${projectId}`);
  }

  const { nextIndex } = getDb()
    .prepare(
      "SELECT COALESCE(MAX(chapter_index), 0) + 1 AS nextIndex FROM chapters WHERE project_id = ?",
    )
    .get(projectId) as unknown as { nextIndex: number };

  const filePath = `${project.root_path}/chapters/${String(nextIndex).padStart(4, "0")}.md`;
  const now = new Date().toISOString();
  const chapter: ChapterMetadata = {
    id: `chapter_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    projectId,
    index: nextIndex,
    title: trimmed,
    filePath,
    status: "draft",
    wordCount: 0,
    revision: 0,
    contentHash: createHash("sha256").update("").digest("hex"),
    createdAt: now,
    updatedAt: now,
  };

  writeChapterFile(filePath, "");
  insertChapterRow(chapter);
  return chapter;
}

/** 读取章节正文。文件不存在视为空章节（新建章节的正文就是空文件）。 */
export function readChapterContent(filePath: string): string {
  try {
    return fs.readFileSync(dataPath(filePath), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

/** 重命名章节（§26.1 Rename Chapter）。revision / content_hash 只跟正文写入走，这里不碰。 */
export function renameChapter(id: string, title: string): ChapterMetadata {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("章节标题不能为空");
  }

  const row = getDb()
    .prepare(
      `UPDATE chapters SET title = ?, updated_at = ? WHERE id = ? RETURNING ${CHAPTER_COLUMNS}`,
    )
    .get(trimmed, new Date().toISOString(), id) as unknown as
    | ChapterRow
    | undefined;
  if (!row) {
    throw new Error(`章节不存在：${id}`);
  }
  return toChapterMetadata(row);
}

/** 删除章节（§26.1 Delete Chapter）：删行 + 删正文文件。 */
export function deleteChapter(id: string): void {
  // 先删行再删文件：行是列表/导航的索引，文件是正文。若顺序颠倒且删行失败，
  // 会留下「列表可见但打开为空」的章节（静默数据丢失）；删行成功但删文件失败
  // 只会留下 UI 不可见的孤儿 .md，可人工回收——后者可接受。
  const row = getDb()
    .prepare("SELECT file_path FROM chapters WHERE id = ?")
    .get(id) as unknown as { file_path: string } | undefined;
  if (!row) {
    throw new Error(`章节不存在：${id}`);
  }

  // §26.1：只允许删除未被 Session/AgentRun/Generation 引用的章节。
  // 当前这些表尚未接入，天然满足；接入 Agent 后在此补引用检查。
  getDb().prepare("DELETE FROM chapters WHERE id = ?").run(id);
  fs.rmSync(dataPath(row.file_path), { force: true });
}

/**
 * 保存章节正文（§26.1 Save Chapter Content，§6.2 revision/contentHash 递增）。
 * 写盘次序有意偏离 §6.2 的字面顺序：先做 revision 前置检查、写 tmp、条件 UPDATE
 * 成功后再 rename 落位。若按「先写文件再更新索引」的朴素顺序，revision 冲突时
 * 正文文件已被覆盖——那是静默数据丢失而非拒绝写入。本实现的冲突路径不触碰正文。
 */
export function saveChapterContent(
  id: string,
  content: string,
  expectedRevision: number,
): ChapterMetadata {
  const existing = getDb()
    .prepare("SELECT file_path, revision FROM chapters WHERE id = ?")
    .get(id) as unknown as
    | { file_path: string; revision: number }
    | undefined;
  if (!existing) {
    throw new Error(`章节不存在：${id}`);
  }
  if (existing.revision !== expectedRevision) {
    throw new Error(`章节已变更（revision ${existing.revision}），保存被拒绝`);
  }

  const absolutePath = dataPath(existing.file_path);
  const tmpPath = `${absolutePath}.tmp`;
  fs.writeFileSync(tmpPath, content);

  const row = getDb()
    .prepare(
      `UPDATE chapters SET content_hash = ?, word_count = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ? RETURNING ${CHAPTER_COLUMNS}`,
    )
    .get(
      createHash("sha256").update(content).digest("hex"),
      countWords(content),
      new Date().toISOString(),
      id,
      expectedRevision,
    ) as unknown as ChapterRow | undefined;
  if (!row) {
    // 前置检查与 UPDATE 之间的竞态：丢弃 tmp，磁盘上的正文从未被动过
    fs.rmSync(tmpPath, { force: true });
    throw new Error("章节已变更，保存被拒绝");
  }

  fs.renameSync(tmpPath, absolutePath);
  return toChapterMetadata(row);
}

function insertChapterRow(chapter: ChapterMetadata): void {
  getDb()
    .prepare(
      "INSERT INTO chapters (id, project_id, chapter_index, title, file_path, status, word_count, revision, content_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      chapter.id,
      chapter.projectId,
      chapter.index,
      chapter.title,
      chapter.filePath,
      chapter.status,
      chapter.wordCount,
      chapter.revision,
      chapter.contentHash,
      chapter.createdAt,
      chapter.updatedAt,
    );
}

function toChapterMetadata(row: ChapterRow): ChapterMetadata {
  return {
    id: row.id,
    projectId: row.project_id,
    index: row.chapter_index,
    title: row.title,
    filePath: row.file_path,
    status: row.status,
    wordCount: row.word_count,
    revision: row.revision,
    contentHash: row.content_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function writeChapterFile(relativePath: string, content: string): void {
  const absolutePath = dataPath(relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
}

/**
 * 解析 data/ 内的相对路径。静态 data/ 前缀让 Turbopack 的静态分析知道
 * 动态部分限于数据目录，避免触发「整个项目被 tracing」警告。
 */
function dataPath(relativePath: string): string {
  return path.join(
    process.cwd(),
    "data",
    relativePath.replace(/^data\//, ""),
  );
}
