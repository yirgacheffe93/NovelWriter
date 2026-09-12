# Data Structure Design

## 1. Purpose

本文档定义 Novel Agent / Harness 的数据结构与持久化边界。

系统的数据分为四类：

```text
Content
Derived Artifact
State
Cache
```

分别采用不同的存储方式：

```text
                    Novel Harness

                         │
       ┌───────────┬────────────┬───────────┐
       │           │            │           │
       ▼           ▼            ▼           ▼
    Content     Artifact       State       Cache
       │           │            │           │
  File System  File System    SQLite      .cache
```

核心原则：

```text
File System = 用户创作内容

Artifact    = 带来源信息的持久化派生数据

SQLite      = 系统状态、索引、运行记录

.cache      = 可重新生成的临时数据
```

Harness 不应该直接依赖具体存储实现。

上层代码通过 Repository / Persistence abstraction 操作数据。

---

# 2. Storage Principles

## 2.1 Content Should Be Human Readable

小说正文、人物设定、世界观等核心创作内容优先保存为：

```text
Markdown
JSON
```

这些数据应该：

- 可以直接打开阅读
- 可以通过 Git 管理
- 可以人工修改
- 不依赖数据库才能恢复
- 可以方便地导入 / 导出

---

## 2.2 Runtime State Should Be Structured

以下数据使用 SQLite：

- Project metadata
- Chapter metadata
- Agent Session
- Agent Run
- Generation
- Agent Event
- LLM Call
- Version relationship
- Retry relationship

这些数据主要用于：

```text
query
history
trace
resume
debug
analytics
```

---

## 2.3 Derived Artifacts Preserve Provenance

结构化章节提取结果和 Wiki 知识文档虽然可以重新生成，但生成成本高，而且承载来源与权威度信息，因此属于持久化派生数据，不是普通 cache。

每个派生数据至少需要保存：

- source path
- source hash
- schema version
- canon level
- generated at

来源哈希变化后，派生数据必须标记为 stale 并重新生成。

---

## 2.4 Cache Is Disposable

`.cache` 中的数据必须满足：

> 删除后系统仍然可以重新生成。

例如：

- chapter summary cache
- context cache
- embedding
- model response cache
- temporary files

`.cache` 不能作为核心数据的唯一存储位置。

---

# 3. File System Layout

推荐：

```text
data/
├── novel.db
│
└── projects/
    ├── novel-001/
    │   ├── project.json
    │   │
    │   ├── story/
    │   │   ├── premise.md
    │   │   ├── world.md
    │   │   ├── style.md
    │   │   └── outline.md
    │   │
    │   ├── characters/
    │   │   ├── protagonist.md
    │   │   ├── heroine.md
    │   │   └── antagonist.md
    │   │
    │   ├── chapters/
    │   │   ├── 0001.md
    │   │   ├── 0002.md
    │   │   └── 0003.md
    │   │
    │   └── memory/
    │       ├── story-summary.md
    │       ├── timeline.json
    │       └── facts.json
    │
    └── novel-002/
        └── ...
```

当前仓库中的既有数据管线映射如下：

| Current path | Data class | Future project-relative path |
|---|---|---|
| `data/raw/` | immutable/imported source | `sources/raw/` |
| `data/new_generated/` | generated draft source | `sources/generated/` |
| `data/chapters/` | derived chapter extraction | `artifacts/chapters/` |
| `data/wiki/` | derived durable knowledge | `artifacts/wiki/` |
| `data/wiki_tmp/` | build state | `artifacts/build-state/` |

本轮设计不要求立即移动已有文件。Repository 在迁移完成前负责兼容当前路径；新 Project 使用 project-relative path。

运行时缓存：

```text
.cache/
├── context/
├── summaries/
├── embeddings/
└── temp/
```

---

# 4. Project Structure

一个 Project 对应一本小说。

SQLite 保存 Project metadata。

小说实际内容保存在：

```text
data/projects/{projectId}/
```

---

## 4.1 Project

TypeScript：

```ts
export interface Project {
  id: string;

  name: string;

  description?: string;

  rootPath: string;

  status: ProjectStatus;

  createdAt: string;
  updatedAt: string;
}
```

状态：

```ts
export type ProjectStatus =
  | "active"
  | "archived";
```

示例：

```json
{
  "id": "novel-001",
  "name": "长夜",
  "description": "末日背景长篇小说",
  "rootPath": "data/projects/novel-001",
  "status": "active",
  "createdAt": "2026-09-11T10:00:00Z",
  "updatedAt": "2026-09-11T10:00:00Z"
}
```

---

# 5. Project Configuration

每个小说目录保留：

```text
project.json
```

用于描述该项目本身。

例如：

```json
{
  "id": "novel-001",
  "name": "长夜",
  "description": "末日背景长篇小说",
  "status": "active",
  "language": "zh-CN",
  "genre": "science-fiction",
  "defaultModel": "gpt-5.6",
  "defaultTargetWords": 2000,
  "createdAt": "2026-09-11T10:00:00Z",
  "updatedAt": "2026-09-11T10:00:00Z"
}
```

`project.json` 是可移植 Project 配置的 Source of Truth。

SQLite 中的 `projects` 表是可以从 `project.json` 重建的系统索引。创建、导入或更新 Project 时，Repository 必须先原子写入 `project.json`，再刷新 SQLite 索引。

`rootPath` 只保存在 SQLite，用于定位本机目录；它不写入可移植配置。

---

# 6. Chapter

Chapter 是最核心的内容实体。

正文存文件。

metadata 存 SQLite。

关系：

```text
Project
   │
   ├── Chapter 001
   ├── Chapter 002
   └── Chapter 003
```

---

## 6.1 Chapter Metadata

```ts
export interface Chapter {
  id: string;

  projectId: string;

  index: number;

  title: string;

  filePath: string;

  status: ChapterStatus;

  wordCount: number;

  revision: number;

  contentHash: string;

  createdAt: string;
  updatedAt: string;
}
```

状态：

```ts
export type ChapterStatus =
  | "draft"
  | "final";
```

---

## 6.2 Chapter File

例如：

```text
data/projects/novel-001/chapters/0012.md
```

内容：

```md
夜幕完全落下的时候，远处的城市终于出现在他们眼前。

……
```

第一阶段正文直接保存 Markdown。

不要将正文同时重复保存在 SQLite。

章节标题以 SQLite `chapters.title` 为 Source of Truth，正文文件只保存正文，不重复保存标题。每次正文成功写入后，Repository 同时递增 `revision`，并更新 `contentHash`、`wordCount` 和 `updatedAt`。

---

# 7. Story Documents

Project 可以包含多个长期上下文文档。

推荐：

```text
story/
├── premise.md
├── world.md
├── style.md
└── outline.md
```

---

## 7.1 premise.md

小说核心设定。

例如：

```text
故事主题
主要矛盾
核心人物
故事基调
```

---

## 7.2 world.md

世界观设定。

例如：

```text
地理
社会结构
能力体系
组织
科技
历史
规则
```

---

## 7.3 style.md

写作风格约束。

例如：

```text
叙述视角
句子长度
对白风格
节奏
禁止出现的表达
```

---

## 7.4 outline.md

剧情规划。

未来可以进一步结构化，但 MVP 使用 Markdown。

---

# 8. Characters

人物信息使用独立文件。

```text
characters/
├── protagonist.md
├── heroine.md
└── antagonist.md
```

人物文件可以采用 Markdown + frontmatter。

例如：

```md
---
id: character-001
name: 林默
role: protagonist
---

# 林默

## Background

……

## Personality

……

## Motivation

……

## Relationships

……
```

数据库第一阶段不需要为 Character 建表。

等未来出现：

```text
人物关系查询
人物自动检索
角色状态追踪
```

再考虑结构化。

---

# 9. Memory

Memory 表示由 Harness 维护的小说长期状态。

推荐：

```text
memory/
├── story-summary.md
├── timeline.json
└── facts.json
```

---

## 9.1 Story Summary

```text
story-summary.md
```

用于保存小说当前整体摘要。

可以由 Agent 自动更新。

---

## 9.2 Timeline

```json
{
  "events": [
    {
      "id": "event-001",
      "chapterId": "chapter-001",
      "description": "主角离开家乡",
      "order": 1
    }
  ]
}
```

---

## 9.3 Facts

用于保存需要保持一致的事实：

```json
{
  "facts": [
    {
      "id": "fact-001",
      "subject": "林默",
      "predicate": "年龄",
      "value": "24"
    }
  ]
}
```

MVP 阶段可以暂时不实现自动维护。

---

# 9.4 Source and Derived Artifact

现有章节提取和 Wiki 编译管线继续保留。它们不与用户可编辑的 Chapter 正文混为同一实体。

```ts
export interface ArtifactProvenance {
  schemaVersion: string;

  sourcePath: string;
  sourceHash: string;

  canonLevel: "official" | "generated";

  generatedAt: string;
}
```

规则：

- `data/raw` 是导入来源，默认不可由 Editor 覆盖。
- `data/new_generated` 是尚未进入正式 Chapter 的续写来源。
- `data/chapters` 和 `data/wiki` 是持久化派生数据，必须携带 `ArtifactProvenance`。
- `.cache` 不保存唯一的来源、canon level 或 schema version。
- `sourceHash` 与当前来源不一致时，读取方必须把 Artifact 视为 stale。

第一阶段不要求为 Artifact 建表，来源信息继续保存在 JSON 或 Markdown frontmatter 中。

---

# 10. SQLite Database

数据库文件：

```text
data/novel.db
```

第一阶段推荐 SQLite。

核心表：

```text
projects

chapters

sessions

agent_runs

llm_calls

generations

agent_events
```

关系：

```text
Project
   │
   ├── Chapters
   │
   └── Sessions
          │
          └── Agent Runs
                │
                ├── Events
                │
                └── LLM Calls
                         │
                         └── Generations
```

每个数据库连接初始化后必须立即执行：

```sql
PRAGMA foreign_keys = ON;
```

应用启动时必须检查返回值为 `1`，不能假设 SQLite 默认启用外键。

---

# 11. projects Table

```sql
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

CREATE UNIQUE INDEX idx_project_root_path
ON projects(root_path);
```

`root_path` 必须保存规范化后的本机路径。同一个目录不能被注册为两个 Project。

---

# 12. chapters Table

```sql
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

    FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE RESTRICT
);
```

约束：

```sql
CREATE UNIQUE INDEX idx_chapter_project_index
ON chapters(project_id, chapter_index);

CREATE UNIQUE INDEX idx_chapter_project_path
ON chapters(project_id, file_path);

CREATE UNIQUE INDEX idx_chapter_id_project
ON chapters(id, project_id);
```

`file_path` 必须是位于 Project root 内的规范化相对路径。Repository 必须拒绝绝对路径和包含 `..` 的路径。

---

# 13. Session

Session 表示用户与某个 Project 的连续 Agent 工作会话。

不要把 Session 等价于一次 Generation。

例如：

```text
Session
   │
   ├── Continue Chapter
   ├── Retry
   ├── Rewrite
   └── Continue Again
```

这些都可以属于同一个 Session。

---

## 13.1 Session Interface

```ts
export interface Session {
  id: string;

  projectId: string;

  activeChapterId?: string;

  status: SessionStatus;

  createdAt: string;
  updatedAt: string;
}

export type SessionStatus =
  | "active"
  | "closed";
```

Session 只允许从 `active` 转为 `closed`。关闭 Session 前应清空 `activeChapterId`。

---

## 13.2 sessions Table

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,

    project_id TEXT NOT NULL,

    active_chapter_id TEXT,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'closed')),

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    CHECK (status = 'active' OR active_chapter_id IS NULL),

    FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (active_chapter_id, project_id)
        REFERENCES chapters(id, project_id)
        ON DELETE RESTRICT
);

CREATE UNIQUE INDEX idx_session_id_project
ON sessions(id, project_id);
```

---

# 14. Agent Run

Agent Run 表示 Harness 一次完整执行。

例如用户点击：

```text
Continue
```

产生：

```text
AgentRun
```

Retry 则创建新的 AgentRun。

---

## 14.1 AgentRun

```ts
export interface AgentRun {
  id: string;

  sessionId: string;

  projectId: string;

  chapterId?: string;

  type: AgentRunType;

  status: AgentRunStatus;

  createdAt: string;

  startedAt?: string;

  finishedAt?: string;

  error?: string;
}
```

类型：

```ts
export type AgentRunType =
  | "continue"
  | "rewrite"
  | "review"
  | "summarize";
```

状态：

```ts
export type AgentRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";
```

允许的状态转换：

```text
pending → running | cancelled
running → completed | failed | cancelled
```

`completed`、`failed` 和 `cancelled` 是终止状态，不允许再次转换。

---

# 15. agent_runs Table

```sql
CREATE TABLE agent_runs (
    id TEXT PRIMARY KEY,

    session_id TEXT NOT NULL,

    project_id TEXT NOT NULL,

    chapter_id TEXT,

    run_type TEXT NOT NULL
        CHECK (run_type IN ('continue', 'rewrite', 'review', 'summarize')),

    status TEXT NOT NULL
        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),

    created_at TEXT NOT NULL,

    started_at TEXT,

    finished_at TEXT,

    error TEXT,

    CHECK (
        (status = 'pending' AND started_at IS NULL AND finished_at IS NULL)
        OR
        (status = 'running' AND started_at IS NOT NULL AND finished_at IS NULL)
        OR
        (status IN ('completed', 'failed') AND started_at IS NOT NULL AND finished_at IS NOT NULL)
        OR
        (status = 'cancelled' AND finished_at IS NOT NULL)
    ),

    CHECK (
        (status = 'failed' AND error IS NOT NULL)
        OR
        (status <> 'failed' AND error IS NULL)
    ),

    FOREIGN KEY (session_id, project_id)
        REFERENCES sessions(id, project_id)
        ON DELETE RESTRICT,

    FOREIGN KEY (chapter_id, project_id)
        REFERENCES chapters(id, project_id)
        ON DELETE RESTRICT
);
```

`pending` Run 尚未开始，因此 `started_at` 允许为空；进入 `running` 时写入。所有终止状态必须写入 `finished_at`，其中只有 `failed` 可以写入 `error`。

---

# 15.1 llm_calls Table

`llm_calls` 是精确模型请求、响应、usage 和错误的 Source of Truth。完整字段语义见 LLM Module；MVP schema 定义如下：

```sql
CREATE TABLE llm_calls (
    id TEXT PRIMARY KEY,

    run_id TEXT,
    project_id TEXT,
    chapter_id TEXT,

    purpose TEXT NOT NULL,
    provider TEXT,
    model TEXT NOT NULL,

    request_json TEXT NOT NULL CHECK (json_valid(request_json)),
    response_json TEXT CHECK (response_json IS NULL OR json_valid(response_json)),

    status TEXT NOT NULL
        CHECK (status IN ('pending', 'running', 'completed', 'failed')),

    input_tokens INTEGER CHECK (input_tokens IS NULL OR input_tokens >= 0),
    output_tokens INTEGER CHECK (output_tokens IS NULL OR output_tokens >= 0),
    total_tokens INTEGER CHECK (total_tokens IS NULL OR total_tokens >= 0),

    cost_micros INTEGER CHECK (cost_micros IS NULL OR cost_micros >= 0),
    cost_currency TEXT,
    latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),

    provider_request_id TEXT,
    error TEXT,

    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,

    CHECK (chapter_id IS NULL OR project_id IS NOT NULL),

    CHECK (
        (status = 'pending' AND started_at IS NULL AND finished_at IS NULL)
        OR
        (status = 'running' AND started_at IS NOT NULL AND finished_at IS NULL)
        OR
        (status IN ('completed', 'failed') AND started_at IS NOT NULL AND finished_at IS NOT NULL)
    ),

    CHECK (
        (status = 'failed' AND error IS NOT NULL)
        OR
        (status <> 'failed' AND error IS NULL)
    ),

    FOREIGN KEY (run_id)
        REFERENCES agent_runs(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (chapter_id)
        REFERENCES chapters(id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_llm_calls_run_created
ON llm_calls(run_id, created_at);
```

关联 AgentRun 时，`project_id` 和 `chapter_id` 必须与该 Run 一致；独立 Playground 或 Evaluation 调用可以没有 `run_id`。该跨字段不变量由 LLMService 在单一入口校验。

---

# 16. Generation

Generation 表示一次有业务意义、可以交给用户审阅或使用的模型生成结果。

一个 AgentRun 可以包含多个内部 LLMCall，但内部规划和评审调用不自动创建 Generation。只有需要保留给用户处理的输出才创建 Generation。

例如：

```text
Agent Run
   │
   ├── Planner LLMCall
   ├── Writer LLMCall
   │       └── Writer Generation
   └── Reviewer LLMCall
```

MVP 中一个 Continue Run 通常只有一个 Writer Generation。

---

## 16.1 Generation Interface

```ts
export interface Generation {
  id: string;

  runId: string;

  llmCallId: string;

  role: GenerationRole;

  output?: string;

  baseChapterRevision?: number;
  baseContentHash?: string;

  operation?: GenerationOperation;

  parentGenerationId?: string;

  status: GenerationStatus;

  disposition: GenerationDisposition;

  createdAt: string;
  settledAt?: string;
}
```

角色：

```ts
export type GenerationRole =
  | "planner"
  | "writer"
  | "reviewer"
  | "summarizer";
```

状态：

```ts
export type GenerationStatus =
  | "completed"
  | "failed";

export type GenerationDisposition =
  | "pending"
  | "applied"
  | "conflict";

export type GenerationOperation =
  | "append"
  | "replace";
```

`status` 表示模型生成是否成功，`disposition` 表示生成结果是否已进入正文。失败 Generation 的 `output` 可以为空，且 disposition 必须保持 `pending`。

`disposition` 只允许从 `pending` 转为 `applied` 或 `conflict`，两个终止值不能互相转换：

- `applied`：写入前校验通过，正文已更新
- `conflict`：写入前校验失败（Chapter revision 或 contentHash 已变化），正文未被覆盖

准确的 model、instruction、prompt 和完整 response 通过 `llmCallId` 查询，避免在 Generation 与 LLMCall 中保存两份可能漂移的数据。

---

# 17. Retry Relationship

Retry 不覆盖原 Generation。

例如：

```text
Generation A
     │
     └── Retry
           │
           ▼
      Generation B
```

通过：

```text
parent_generation_id
```

表达关系。

这样可以完整保留历史。

---

# 18. generations Table

```sql
CREATE TABLE generations (
    id TEXT PRIMARY KEY,

    run_id TEXT NOT NULL,

    llm_call_id TEXT NOT NULL,

    role TEXT NOT NULL
        CHECK (role IN ('planner', 'writer', 'reviewer', 'summarizer')),

    output TEXT,

    base_chapter_revision INTEGER
        CHECK (base_chapter_revision IS NULL OR base_chapter_revision >= 0),

    base_content_hash TEXT,

    operation TEXT
        CHECK (operation IS NULL OR operation IN ('append', 'replace')),

    parent_generation_id TEXT,

    status TEXT NOT NULL
        CHECK (status IN ('completed', 'failed')),

    disposition TEXT NOT NULL DEFAULT 'pending'
        CHECK (disposition IN ('pending', 'applied', 'conflict')),

    created_at TEXT NOT NULL,

    settled_at TEXT,

    FOREIGN KEY (run_id)
        REFERENCES agent_runs(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (llm_call_id)
        REFERENCES llm_calls(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (parent_generation_id)
        REFERENCES generations(id)
        ON DELETE RESTRICT,

    CHECK (
        (status = 'completed' AND output IS NOT NULL)
        OR
        (status = 'failed' AND disposition = 'pending')
    ),

    CHECK (
        role <> 'writer'
        OR
        (
            base_chapter_revision IS NOT NULL
            AND base_content_hash IS NOT NULL
            AND operation IS NOT NULL
        )
    ),

    CHECK (
        (disposition = 'pending' AND settled_at IS NULL)
        OR
        (disposition IN ('applied', 'conflict') AND settled_at IS NOT NULL)
    )
);

CREATE INDEX idx_generations_run_created
ON generations(run_id, created_at);
```

第一阶段 Generation output 可以直接保存在数据库。

因为它属于 Harness Trace，而不是正式小说正文。

只有写入前校验通过：

```text
verify revision + contentHash
```

之后，内容才进入 Chapter File。

这是一个重要边界：

```text
Generated text
      ↓
Generation

verify revision + contentHash
      ↓
Chapter Content
```

校验由系统在写入前自动执行，不需要用户确认；不一致时 Generation 记为 `conflict`，正文保持原样。

---

# 19. Agent Event

Agent Event 是 Harness 最核心的可观测数据。

一次 Run 可以产生：

```text
run.started

context.selected

context.built

llm.requested

llm.completed

generation.created

run.completed
```

写入正文时还会产生 `generation.write.started`，随后是 `generation.applied` 或 `generation.conflict`。

未来还可以增加：

```text
tool.called

tool.completed

plan.created

evaluation.completed

memory.updated
```

---

# 20. AgentEvent Interface

```ts
export interface AgentEvent<T = unknown> {
  id: string;

  runId: string;

  seq: number;

  type: AgentEventType;

  timestamp: string;

  data: T;
}

export type AgentEventType =
  | "run.started"
  | "run.completed"
  | "run.failed"
  | "context.selected"
  | "context.built"
  | "llm.requested"
  | "llm.completed"
  | "generation.created"
  | "generation.write.started"
  | "generation.applied"
  | "generation.conflict";
```

`data` 使用 JSON payload。

不要为每一种 Event 单独建 SQL 表。

---

# 21. Event Example

例如：

```json
{
  "id": "evt-001",
  "runId": "run-001",
  "seq": 3,
  "type": "context.selected",
  "timestamp": "2026-09-11T10:01:03Z",
  "data": {
    "chapters": [
      "chapter-010",
      "chapter-011",
      "chapter-012"
    ],
    "documents": [
      "story/world.md",
      "characters/protagonist.md"
    ]
  }
}
```

另一个事件：

```json
{
  "id": "evt-002",
  "runId": "run-001",
  "seq": 4,
  "type": "context.built",
  "timestamp": "2026-09-11T10:01:04Z",
  "data": {
    "tokenCount": 12480
  }
}
```

---

# 22. agent_events Table

```sql
CREATE TABLE agent_events (
    id TEXT PRIMARY KEY,

    run_id TEXT NOT NULL,

    seq INTEGER NOT NULL CHECK (seq > 0),

    type TEXT NOT NULL,

    timestamp TEXT NOT NULL,

    data TEXT NOT NULL CHECK (json_valid(data)),

    FOREIGN KEY (run_id)
        REFERENCES agent_runs(id)
        ON DELETE RESTRICT
);
```

索引：

```sql
CREATE UNIQUE INDEX idx_agent_event_run_seq
ON agent_events(run_id, seq);
```

其中：

```text
data
```

保存 JSON。

应用层负责：

```ts
JSON.stringify(data)
JSON.parse(data)
```

---

# 23. Event Ordering

Event 顺序不要只依赖 timestamp。

必须使用：

```text
run_id + seq
```

例如：

```text
run-001

seq 1
seq 2
seq 3
seq 4
```

这样可以稳定恢复 Agent Execution。

---

# 24. Context

Context 第一阶段不需要独立数据库表。

Context 是：

```text
某次 Agent Run 为模型选择的数据集合
```

可以记录在：

```text
context.selected
```

Event 中。

例如：

```json
{
  "chapters": [
    {
      "id": "chapter-010",
      "reason": "recent"
    },
    {
      "id": "chapter-003",
      "reason": "character_reference"
    }
  ],
  "documents": [
    "story/world.md"
  ]
}
```

真正拼接后的完整 Context 如果很大，可以写入文件：

```text
.cache/context/{runId}.txt
```

Event 只记录：

```json
{
  "cachePath": ".cache/context/run-001.txt",
  "tokenCount": 14532
}
```

该 cache 文件用于调试和快速查看，允许删除。真正发送给模型的完整 messages 保存在对应 `llm_calls.request_json`，因此 replay 不依赖 cache。

---

# 25. Cache Structure

推荐：

```text
.cache/
│
├── context/
│   ├── run-001.txt
│   └── run-002.txt
│
├── summaries/
│   ├── chapter-001.json
│   └── chapter-002.json
│
├── embeddings/
│
└── temp/
```

Cache 应该可以随时清空：

```bash
rm -rf .cache
```

之后系统仍然正常工作。

---

# 26. Persistence Abstraction

Harness 不应该直接：

```ts
db.prepare(...)
```

或者：

```ts
fs.readFile(...)
```

核心模块应该依赖 interface。

---

# 27. ProjectRepository

```ts
export interface ProjectRepository {
  create(project: Project): Promise<void>;

  get(id: string): Promise<Project | null>;

  list(): Promise<Project[]>;

  update(project: Project): Promise<void>;

  archive(id: string): Promise<void>;
}
```

---

# 28. ChapterRepository

```ts
export interface ChapterRepository {
  list(projectId: string): Promise<Chapter[]>;

  get(id: string): Promise<Chapter | null>;

  getContent(id: string): Promise<string>;

  create(
    chapter: Chapter,
    content: string
  ): Promise<void>;

  saveContent(
    id: string,
    content: string,
    expectedRevision: number
  ): Promise<Chapter>;

  updateMetadata(
    chapter: Chapter
  ): Promise<void>;

  delete(id: string): Promise<void>;
}
```

底层可以同时操作：

```text
SQLite metadata
+
Markdown content
```

但调用方无需知道。

---

# 29. SessionPersistence

Harness Session 单独抽象：

```ts
export interface SessionPersistence {
  createSession(
    session: Session
  ): Promise<void>;

  getSession(
    sessionId: string
  ): Promise<Session | null>;

  createRun(
    run: AgentRun
  ): Promise<void>;

  updateRun(
    run: AgentRun
  ): Promise<void>;

  appendEvent(
    event: AgentEvent
  ): Promise<void>;

  listEvents(
    runId: string
  ): Promise<AgentEvent[]>;
}
```

第一版实现：

```text
SQLiteSessionPersistence
```

以后可以实现：

```text
JsonlSessionPersistence
```

Harness 本身不能依赖 SQLite。

---

# 30. GenerationRepository

```ts
export interface GenerationRepository {
  create(
    generation: Generation
  ): Promise<void>;

  get(
    id: string
  ): Promise<Generation | null>;

  listByRun(
    runId: string
  ): Promise<Generation[]>;

  updateDisposition(
    id: string,
    disposition: GenerationDisposition,
    settledAt: string
  ): Promise<void>;
}
```

`saveContent` 使用 optimistic concurrency control。`expectedRevision` 与当前 Chapter 不一致时必须失败，不能覆盖较新的正文。

写入由应用层 service 协调 ChapterRepository、GenerationRepository 和 SessionPersistence；任何单一 Repository 都不跨边界隐藏这项操作。

---

# 31. Cache Interface

```ts
export interface CacheStore {
  get<T>(
    key: string
  ): Promise<T | null>;

  set<T>(
    key: string,
    value: T
  ): Promise<void>;

  delete(
    key: string
  ): Promise<void>;

  clear(): Promise<void>;
}
```

第一版：

```text
FileCacheStore
```

即可。

---

# 32. ID Strategy

所有业务对象使用 string ID。

不要使用：

```text
1
2
3
```

这种自增 ID 作为业务标识。

建议：

```text
project_xxx

chapter_xxx

session_xxx

run_xxx

gen_xxx

evt_xxx
```

实际生成可以使用：

```text
UUID
```

或：

```text
ULID
```

数据库内部无需额外暴露自增 ID。

---

# 33. Time Format

所有时间统一存储：

```text
ISO 8601 UTC
```

例如：

```text
2026-09-11T10:32:41.512Z
```

UI 层负责转换成本地时间。

---

# 34. Data Flow: Open Chapter

```text
User selects Project
        ↓
ProjectRepository
        ↓
load project
        ↓
ChapterRepository.list()
        ↓
select Chapter
        ↓
ChapterRepository.getContent()
        ↓
Editor
```

---

# 35. Data Flow: Save Chapter

```text
Editor
   ↓
save
   ↓
ChapterRepository.saveContent()
   ↓
Markdown File

同时：

wordCount
updatedAt
   ↓
SQLite Chapter Metadata
```

---

# 36. Data Flow: Continue Novel

完整流程：

```text
User clicks Continue
        ↓
create AgentRun
        ↓
run.started
        ↓
Context Builder
        ↓
context.selected
        ↓
context.built
        ↓
LLM Client
        ↓
llm.requested
        ↓
llm.completed
        ↓
create Generation
        ↓
generation.created
        ↓
run.completed
```

Generation 创建完成后立即进入写入流程（见第 37 节）。

---

# 37. Data Flow: Apply Generation

```text
Generation created
        ↓
verify Generation status = completed
and disposition = pending
        ↓
verify Chapter revision + contentHash
        ↓
generation.write.started
(contains expected result hash)
        ↓
write temp file + atomic rename
        ↓
SQLite transaction:
update Chapter metadata
Generation disposition = applied
generation.applied
```

写入由系统在生成完成后自动执行，不需要用户确认。

这是非常重要的数据边界。

Agent 永远不要无条件覆盖小说正文：写入前必须校验 revision 与 contentHash。

如果校验失败，不得写入正文：Generation disposition 记为 `conflict`，产生 `generation.conflict` 事件，并把冲突反馈到对话里。

文件系统与 SQLite 不能共享一个原子事务。启动恢复程序查找只有 `generation.write.started`、没有 `generation.applied` 的操作：正文 hash 等于事件中的预期 hash 时完成 SQLite 更新，否则保留 Generation 为 pending 并报告冲突。

---

# 38. Data Flow: Regenerate

用户对结果不满意时，直接在对话里再说一句，不提供 Retry 按钮。

```text
Generation A
      ↓
用户发送新指令
      ↓
New AgentRun
      ↓
Generation B
```

原 Generation 不删除。

Generation A 所属 AgentRun 在生成 A 后已经完成；新的指令创建新 Run，不回滚也不修改旧 Run 的终止状态。

`parentGenerationId` 不由 UI 建立，保留供未来表达生成谱系。

这样可以分析：

```text
用户在什么情况下再次生成
每次生成是否成功写入（applied / conflict）
哪种 Prompt 效果更好
```

---

# 39. Source of Truth

不同数据必须明确唯一 Source of Truth。

| Data | Source of Truth |
|---|---|
| Portable Project configuration | `project.json` |
| Project local index and root path | SQLite |
| Chapter metadata | SQLite |
| Chapter content | Markdown File |
| Character content | Markdown File |
| World setting | Markdown File |
| Story outline | Markdown File |
| Session | SQLite |
| Agent Run | SQLite |
| Generation | SQLite |
| Agent Event | SQLite |
| LLM request / response | SQLite `llm_calls` |
| Chapter extraction artifact | JSON file with provenance |
| Wiki knowledge artifact | Markdown file with provenance |
| Context Cache | `.cache` |
| Embedding | `.cache` |
| Rebuildable Summary Cache | `.cache` |
| User-confirmed Story Summary | Project `memory/story-summary.md` |

禁止同一份核心内容在多个地方成为 Source of Truth。

---

# 40. Database Is Not the Agent API

禁止出现：

```text
Agent
 ↓
raw SQL
```

应该是：

```text
Agent
 ↓
Tool / Repository
 ↓
Persistence
 ↓
SQLite / Files
```

例如 Agent 需要读取最近章节：

```ts
const chapters =
  await novelContextService.getRecentChapters(
    projectId,
    chapterId,
    3
  );
```

而不是：

```ts
db.prepare(`
  SELECT *
  FROM chapters
  ...
`);
```

数据库细节不能泄漏到 Harness Core。

---

# 41. Recommended Package Structure

推荐：

```text
packages/
│
├── core/
│   ├── project.ts
│   ├── chapter.ts
│   ├── session.ts
│   ├── generation.ts
│   └── event.ts
│
├── storage/
│   ├── project-repository.ts
│   ├── chapter-repository.ts
│   ├── generation-repository.ts
│   │
│   ├── sqlite/
│   │   ├── database.ts
│   │   ├── project-repository.ts
│   │   ├── chapter-repository.ts
│   │   └── generation-repository.ts
│   │
│   └── filesystem/
│       └── chapter-content-store.ts
│
├── llm/
│   ├── llm-service.ts
│   └── llm-call-repository.ts
│
├── session/
│   ├── persistence.ts
│   └── sqlite-persistence.ts
│
├── cache/
│   ├── cache-store.ts
│   └── file-cache-store.ts
│
└── agent/
```

重点是：

```text
interface
```

和：

```text
implementation
```

分开。

---

# 42. MVP Database Scope

第一阶段只创建：

```text
projects

chapters

sessions

agent_runs

llm_calls

generations

agent_events
```

暂时不要创建：

```text
characters

world_entities

relationships

story_facts

embeddings

prompts

models

tools

evaluations

memories
```

除非实际功能已经需要。

原则：

> 没有明确查询需求的数据，不要急着关系型建模。

---

# 43. MVP File Scope

第一阶段支持：

```text
project.json

chapters/*.md

story/premise.md

story/world.md

story/style.md

story/outline.md

characters/*.md
```

同时兼容当前仓库的 `data/raw`、`data/new_generated`、`data/chapters`、`data/wiki` 和 `data/wiki_tmp`；其分类与未来路径见第 3 节。MVP 不要求先移动这些既有资产。

Memory 可以等 Agent Loop 跑通以后实现。

---

# 44. Migration

SQLite schema 必须支持 migration。

禁止在应用启动时简单：

```text
DROP TABLE
CREATE TABLE
```

推荐从第一版就建立：

```text
migrations/
```

例如：

```text
migrations/
├── 0001_initial.sql
├── 0002_generation_parent.sql
└── 0003_chapter_status.sql
```

---

# 45. Deletion Strategy

Project 删除需要谨慎。

MVP 推荐：

```text
soft archive
```

优先于真正物理删除。

MVP 的 ProjectRepository 不暴露物理删除，只提供 `archive`。SQLite 外键使用 `ON DELETE RESTRICT`，避免绕过 Repository 时级联删除 Harness Trace。

Project：

```text
active
archived
```

Chapter 只有在未被 Session、AgentRun 或其他保留记录引用时才允许物理删除；否则应保留记录并从常用列表隐藏。UI 必须确认。

Generation 和 AgentEvent 默认不要删除。

这些数据未来用于 Harness 调试和评估。

---

# 46. Observability

Harness 的关键原则：

> Every important Agent action should be observable.

因此重要操作应该产生 Event。

例如：

```text
Context Builder
→ context.selected

LLM
→ llm.requested
→ llm.completed

Generation
→ generation.created

写入
→ generation.write.started
→ generation.applied
→ generation.conflict
```

不要试图记录模型内部 reasoning。

只记录系统实际执行的：

```text
input
output
tool calls
state changes
metadata
```

---

# 47. Future Evolution

未来数据层可以自然扩展：

```text
SQLite
   ↓
PostgreSQL
```

或者：

```text
Local File System
   ↓
Object Storage
```

因为上层依赖：

```text
Repository
Persistence
CacheStore
```

而不是具体实现。

---

# 48. Architecture Summary

最终的数据模型可以概括为：

```text
                           Project
                              │
                  ┌───────────┴──────────┐
                  │                      │
               Chapters               Session
                  │                      │
             Markdown File           Agent Run
                                         │
                               ┌─────────┴─────────┐
                               │                   │
                            LLM Call             Events
                               │
                           Generation
                               │
                     verify revision + hash
                               │
                             applied
                               │
                               ▼
                         Chapter File
```

存储层：

```text
                Persistence Layer

        ┌────────────┬────────────┬───────────┬──────────┐
        │            │            │           │
        ▼            ▼            ▼           ▼
   File System    Artifact      SQLite      Cache
        │            │            │           │
     Content      Derived     State/Trace   Disposable
                  Durable
```

Harness：

```text
Agent Loop
    │
    ├── ProjectRepository
    ├── ChapterRepository
    ├── LLMService
    ├── GenerationRepository
    ├── SessionPersistence
    └── CacheStore
```

Harness Core 不应该知道底层究竟是：

```text
SQLite
JSONL
PostgreSQL
Local File
Cloud Storage
```

这将是本项目数据层长期保持的核心边界。
