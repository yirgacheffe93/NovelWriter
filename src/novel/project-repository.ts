/**
 * Project 持久化：project.json（可移植配置 SoT）+ SQLite 索引。
 * 写入次序是硬约束（overview §5）：先原子写入 project.json，再刷新 SQLite 索引。
 * 业务层不提供物理删除（§45）：归档通过 updateProject 改 status 实现；
 * deleteProject 仅供导入失败回滚。
 */
import fs from "node:fs";
import path from "node:path";
import type { Project } from "./types";
import { getDb } from "../storage/db";
import { resolveDataPath, resolveDataPathInside } from "../storage/paths";

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  root_path: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

/** 可移植配置不含 rootPath，它只保存在 SQLite（overview §5）。 */
type ProjectJson = Omit<Project, "rootPath">;

export function listProjects(): Project[] {
  const rows = getDb()
    .prepare(
      "SELECT id, name, description, root_path, status, created_at, updated_at FROM projects ORDER BY rowid",
    )
    .all() as unknown as ProjectRow[];
  return rows.map(toProject);
}

export function createProject(project: Project): void {
  writeProjectJson(project);
  getDb()
    .prepare(
      "INSERT INTO projects (id, name, description, root_path, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      project.id,
      project.name,
      project.description ?? null,
      project.rootPath,
      project.status,
      project.createdAt,
      project.updatedAt,
    );
}

export function getProject(id: string): Project | null {
  const row = getDb()
    .prepare(
      "SELECT id, name, description, root_path, status, created_at, updated_at FROM projects WHERE id = ?",
    )
    .get(id) as unknown as ProjectRow | undefined;
  return row ? toProject(row) : null;
}

/**
 * 更新项目（§27 的 update/archive 合并：软归档 = status 变更）。
 * 写入次序（§5）：先原子写 project.json，再刷新 SQLite 索引。
 * root_path 不可变（也是定位 project.json 的依据），不参与 UPDATE。
 */
export function updateProject(project: Project): Project {
  writeProjectJson(project);

  const result = getDb()
    .prepare(
      "UPDATE projects SET name = ?, description = ?, status = ?, updated_at = ? WHERE id = ?",
    )
    .run(
      project.name,
      project.description ?? null,
      project.status,
      project.updatedAt,
      project.id,
    );
  if (result.changes === 0) {
    throw new Error(`项目不存在：${project.id}`);
  }
  return project;
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    ...(row.description !== null ? { description: row.description } : {}),
    rootPath: row.root_path,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 物理删除项目：删章节行 → 删项目行 → 删项目目录。
 * 两个调用方：导入失败回滚，以及归档分组里的「删除」（§45 的业务删除是归档，
 * 这里是不可恢复的物理删除，经 deleteProjectAction 暴露）。
 * 目录删除失败只留孤儿文件，不抛错。
 */
export function deleteProject(projectId: string): void {
  const db = getDb();
  const row = db
    .prepare("SELECT root_path FROM projects WHERE id = ?")
    .get(projectId) as unknown as { root_path: string } | undefined;
  if (!row) {
    throw new Error(`项目不存在：${projectId}`);
  }

  // root_path 按约定是 data/projects/<id>。若损坏成 data/projects，下面会删掉
  // 全部项目；若为空或 data，则删掉数据目录本身。两者都不该发生，拒绝执行。
  if (!/^data\/projects\/[^/]+$/.test(row.root_path)) {
    throw new Error(`项目路径不符合约定，已拒绝删除：${row.root_path}`);
  }

  // 再解析并校验目录：越界时抛错，此时库行尚未删除，项目仍完整可访问
  const projectDir = resolveDataPathInside(row.root_path);

  db.prepare("DELETE FROM chapters WHERE project_id = ?").run(projectId);
  db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
  fs.rmSync(projectDir, { recursive: true, force: true });
}

function writeProjectJson(project: Project): void {
  const json: ProjectJson = {
    id: project.id,
    name: project.name,
    ...(project.description ? { description: project.description } : {}),
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
  const filePath = path.join(
    resolveDataPath(project.rootPath),
    "project.json",
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(json, null, 2));
  fs.renameSync(tmpPath, filePath);
}
