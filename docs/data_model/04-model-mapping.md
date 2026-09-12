# Model Mapping

## 1. Purpose

本文档描述：

> Business Domain Model、Agent Runtime Model 和 Persistence Model 如何连接。

---

## 2. Overall Relationship

```text
Business Domain
       │
       │ target
       ▼
Agent Runtime
       │
       │ persistence
       ▼
Storage
```

例如：

```text
Chapter 18
   │
   │ Continue
   ▼
AgentRun
   │
   ├── Context
   ├── LLMCall
   │      └── Generation
   └── Events
```

---

## 3. Business → Agent

AgentRun 通过业务对象 ID 关联小说数据。

例如：

```ts
interface AgentRun {
  id: string

  projectId: string
  chapterId?: string

  type: "continue" | "rewrite"
}
```

不要把 Agent 状态直接塞进 Chapter。

错误示例：

```ts
interface Chapter {
  content: string

  model: string
  prompt: string
  runStatus: string
}
```

正确方式：

```text
Chapter
   ↑
   │ target
AgentRun
```

---

## 4. Business → Persistence

例如 Chapter：

应用层看到：

```ts
interface Chapter {
  id: string
  title: string
  content: string
}
```

实际存储可以拆成：

```text
SQLite
-------
id
project_id
title
file_path

Markdown
--------
content
```

因此：

> Business Model 不等于 SQL Table。

---

## 5. Agent → Persistence

例如 AgentRun 和 AgentEvent：

```text
AgentRun
→ SQLite agent_runs

AgentEvent
→ SQLite agent_events

Generation
→ SQLite generations

LLMCall
→ SQLite llm_calls
```

Context 等可重建中间结果：

```text
Context
→ .cache/context/
```

完整模型 Request / Response 保存在 `llm_calls`，因此 replay 不依赖 Context cache。

Generation 通过 `llmCallId` 关联准确的模型调用，并以 `status` 表示生成结果、以 `disposition` 表示用户的 Accept / Discard 决策。

---

## 6. Recommended Code Boundary

```text
packages/

domain/
├── project.ts
├── chapter.ts
└── character.ts

agent/
├── session.ts
├── run.ts
├── generation.ts
└── event.ts

storage/
├── repositories/
├── sqlite/
├── filesystem/
└── cache/
```

---

## 7. Core Rule

每次设计一个新字段时，先问三个问题：

```text
1. 这是小说本身的数据吗？
→ Business Domain

2. 这是 Agent 执行过程的数据吗？
→ Agent Runtime

3. 它最终应该存在哪里？
→ Persistence
```

这三个问题可以避免后期数据模型混乱。
