# Business Domain Model

## 1. Purpose

业务数据模型描述“小说本身是什么”。

这部分不关心 Agent 如何运行，只关注小说创作领域中的核心对象。

---

## 2. Core Objects

### Project / Novel

一本小说对应一个 Project。

```ts
interface Project {
  id: string
  name: string
  description?: string
  status: "active" | "archived"
  createdAt: string
  updatedAt: string
}
```

---

### Chapter

Chapter 表示小说中的一个章节。

```ts
interface Chapter {
  id: string
  projectId: string
  index: number
  title: string
  content: string
  status: "draft" | "final"
}
```

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
