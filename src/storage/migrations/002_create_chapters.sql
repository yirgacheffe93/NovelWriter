-- chapters 表：章节元数据的系统索引（overview §12）。
-- 标题 SoT 在 SQLite（chapters.title），正文 SoT 在 chapters/*.md 文件（§6.2）。
CREATE TABLE chapters (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    chapter_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'final')),
    word_count INTEGER NOT NULL DEFAULT 0
        CHECK (word_count >= 0),
    revision INTEGER NOT NULL DEFAULT 0
        CHECK (revision >= 0),
    content_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX idx_chapter_project_index ON chapters(project_id, chapter_index);
CREATE UNIQUE INDEX idx_chapter_project_path ON chapters(project_id, file_path);
CREATE UNIQUE INDEX idx_chapter_id_project ON chapters(id, project_id);
