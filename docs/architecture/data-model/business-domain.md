# Business Domain Model

## 1. Purpose

业务数据模型描述“小说本身是什么”。

这部分不关心 Agent 如何运行，只关注小说创作领域中的核心对象。

---

## 2. Core Objects

### Project / Novel

一本小说对应一个 Project。

字段的权威定义（含 `rootPath` 与时间戳）见 [数据模型总览](overview.md) 第 4 节。从业务视角看，它只需要回答三件事：这本小说叫什么、怎么描述它、它是否还在使用中（`active` / `archived`）。

---

### Chapter

Chapter 表示小说中的一个章节，由元数据与正文两部分组成。

正文的 Source of Truth 是 Markdown 文件，因此业务模型里分成两个类型：

- `ChapterMetadata`：章节身份、顺序与保存状态，持久化在 SQLite
- `ChapterDocument`：应用层读取章节时的组合视图，正文来自 Markdown 文件

字段的权威定义见 [数据模型总览](overview.md) 第 6 节。

---

### Character

Character 表示小说中的人物。

```ts
interface Character {
  id: string
  projectId: string
  name: string
  role?: string
  description?: string
}
```

---

### Story Documents

用于描述小说长期设定：

```text
Premise
World
Outline
Style
```

第一阶段可以直接使用 Markdown 文件存储。

---

## 3. Relationships

```text
Project
├── Chapters
├── Characters
├── World
├── Outline
└── Style
```

---

## 4. Principle

业务模型只回答：

> 小说是什么？

不要把以下 Agent 字段放进业务模型：

```text
model
prompt
toolCall
runStatus
generation
agentEvent
```

这些属于 Agent Runtime Model。
