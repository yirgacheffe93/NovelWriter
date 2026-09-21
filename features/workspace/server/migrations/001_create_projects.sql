-- projects 表：可从 project.json 重建的系统索引（overview §5）。
-- DDL 权威定义见 docs/architecture/data-model/overview.md §11。
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    root_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_project_root_path ON projects(root_path);
