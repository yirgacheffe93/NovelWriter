/**
 * Project 持久化：project.json（可移植配置 SoT）+ SQLite 索引。
 * 写入次序是硬约束（overview §5）：先原子写入 project.json，再刷新 SQLite 索引。
 * 不提供物理删除（§45）：归档通过 updateProject 改 status 实现。
 */
import fs from "node:fs";
import path from "node:path";
import type { Project } from "../types";
import { getDb } from "./db";

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

function writeProjectJson(project: Project): void {
  const json: ProjectJson = {
    id: project.id,
    name: project.name,
    ...(project.description ? { description: project.description } : {}),
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
  const filePath = path.join(process.cwd(), project.rootPath, "project.json");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(json, null, 2));
  fs.renameSync(tmpPath, filePath);
}
