/**
 * SQLite 连接与迁移。
 * 约束见 docs/architecture/data-model/overview.md：数据库是可由 project.json
 * 重建的系统索引；必须走 migrations/（§44），禁止启动时 DROP/CREATE。
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "novelwriter.db");
const MIGRATIONS_DIR = path.join(
  process.cwd(),
  "features",
  "workspace",
  "server",
  "migrations",
);

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  migrate(db);
  return db;
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
