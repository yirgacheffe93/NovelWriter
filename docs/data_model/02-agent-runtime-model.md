# Agent Runtime Model

## 1. Purpose

Agent Runtime Model 描述：

> Agent 为了完成一次任务，发生了什么。

它应该尽量与“小说”业务解耦，以便未来复用到其他 Agent 场景。

---

## 2. Core Objects

### Session

表示一段连续的 Agent 工作会话。

```ts
interface Session {
  id: string
  projectId: string
  status: "active" | "closed"
  createdAt: string
}
```

Session 只允许从 `active` 转为 `closed`。

---

### AgentRun

一次 Agent 任务执行。

例如：

```text
continue
rewrite
review
summarize
```

```ts
interface AgentRun {
  id: string
  sessionId: string

  projectId: string
  chapterId?: string

  type: "continue" | "rewrite" | "review" | "summarize"

  status:
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "cancelled"

  createdAt: string
  startedAt?: string
  finishedAt?: string
}
```

---

### Generation

一次有业务意义、可以交给用户审阅或使用的模型生成结果。内部 LLM 调用不自动创建 Generation。

```ts
interface Generation {
  id: string
  runId: string
  llmCallId: string

  role: "planner" | "writer" | "reviewer" | "summarizer"
  output?: string

  baseChapterRevision?: number
  baseContentHash?: string
  operation?: "append" | "replace"

  parentGenerationId?: string

  status: "completed" | "failed"
  disposition: "pending" | "accepted" | "discarded"

  createdAt: string
  decidedAt?: string
}
```

`status` 表示生成是否成功；`disposition` 表示用户如何处理结果。model、instruction、prompt 和完整 response 由 `llmCallId` 关联的 LLMCall 提供。

---

### AgentEvent

记录 Agent 执行过程。

```ts
interface AgentEvent {
  id: string
  runId: string

  seq: number
  type: string

  data: unknown
  timestamp: string
}
```

典型事件：

```text
run.started

context.selected

llm.requested

llm.completed

generation.created

run.completed

generation.accepted
```

`run.completed` 在 Generation 创建并持久化后发生。Accept、Discard 或 Retry 不改变旧 AgentRun 的终止状态。

---

## 3. Relationships

```text
Session
└── AgentRun
    ├── AgentEvents
    └── LLMCalls
          └── Generations
```

---

## 4. Principle

Agent Runtime Model 只回答：

> Agent 是怎么完成任务的？

不要在这里定义小说正文、人物设定等业务内容。
