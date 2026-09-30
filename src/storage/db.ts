/**
 * SQLite 连接与迁移。
 * 约束见 docs/architecture/data-model/overview.md：数据库是可由 project.json
 * 重建的系统索引；必须走 migrations/（§44），禁止启动时 DROP/CREATE。
 * 库文件位置由 src/storage/paths.ts 决定，可指向仓库之外。
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getDbPath } from "./paths.ts";

const MIGRATIONS_DIR = path.join(process.cwd(), "src", "storage", "migrations");

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new DatabaseSync(dbPath);
  // llm.md §14：外键约束依赖该 PRAGMA，每个连接必须开启
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
  return db;
}

/**
 * 关闭连接，让下次 getDb() 按当前数据目录重新打开。
 * 切换数据目录时必须调用：否则仍连着旧库。
 */
export function closeDb(): void {
  db?.close();
  db = null;
}

/** 按文件名序应用 migrations/ 下尚未记录过的 .sql 文件，逐个在事务中执行。 */
function migrate(db: DatabaseSync): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY)",
  );
  const applied = new Set(
    (
      db
        .prepare("SELECT id FROM schema_migrations")
        .all() as unknown as { id: string }[]
    ).map((row) => row.id),
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    db.exec("BEGIN");
    try {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (id) VALUES (?)").run(file);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}
