# Agent Runtime Model

## 1. Purpose

Agent Runtime Model 描述：

> Agent 为了完成一次任务，发生了什么。

它应该尽量与“小说”业务解耦，以便未来复用到其他 Agent 场景。

---

## 2. Core Objects

四个对象的**权威定义**在 [数据模型总览](overview.md)：Session 见第 13 节、AgentRun 见第 14 节、Generation 见第 16 节、AgentEvent 见第 20 节。本节只说明它们在运行时模型里的角色，不重复字段定义。

### Session

表示一段连续的 Agent 工作会话。

Session 只允许从 `active` 转为 `closed`，关闭前必须清空 `activeChapterId`。

---

### AgentRun

一次 Agent 任务执行。

类型：

```text
continue
rewrite
review
summarize
```

状态转换：

```text
pending → running | cancelled
running → completed | failed | cancelled
```

`completed`、`failed`、`cancelled` 是终止状态，不允许再次转换。

---

### Generation

一次有业务意义的模型生成结果。内部 LLM 调用不自动创建 Generation。

`status` 表示生成是否成功；`disposition` 表示生成结果是否已进入正文（写入前校验通过为 `applied`，校验失败为 `conflict`）。model、instruction、prompt 和完整 response 由 `llmCallId` 关联的 LLMCall 提供。

---

### AgentEvent

记录 Agent 执行过程。`type` 是封闭枚举，完整取值见总览第 20 节。

典型事件：

```text
run.started

context.selected

llm.requested

llm.completed

generation.created

run.completed

generation.applied
```

`run.completed` 在 Generation 创建并持久化后发生。后续的写入（applied / conflict）或新指令都不改变旧 AgentRun 的终止状态。

---

## 3. Chat Message

对话区展示的消息**不是持久化实体**，而是由 AgentRun 与 Generation 投影得到的读取视图。

| 消息 | 来源 | content 来源 |
|---|---|---|
| `role = "user"` | 一次 AgentRun | 该 Run 的 instruction，随 `llmCallId` 指向的 LLMCall 请求保存 |
| `role = "agent"` | 一个 Generation | `Generation.output` |

```ts
export interface ChatMessage {
  id: string

  role: "user" | "agent"

  content: string

  runId: string

  chapterId?: string

  createdAt: string

  disposition?: GenerationDisposition
}
```

约定：

- `id`：用户消息用 `runId`，agent 消息用 `generationId`
- `createdAt`：用户消息取 `AgentRun.createdAt`，agent 消息取 `Generation.createdAt`
- `disposition` 只有 agent 消息有，直接来自对应的 Generation
- 不建 `messages` 表：正文与指令的唯一 Source of Truth 仍是文件与 `llm_calls`，重复存一份会漂移

`List Messages` 的查询语义：

- 范围：同一 Session 内，按 `chapterId` 过滤
- 排序：`createdAt` 升序；同一时刻按 `runId` 升序
- 边界：Run 在创建 LLMCall 之前就失败时，该用户消息无法还原，查询结果中不出现

---

## 4. Relationships

```text
Session
└── AgentRun
    ├── AgentEvents
    └── LLMCalls
          └── Generations
```

---

## 5. Principle

Agent Runtime Model 只回答：

> Agent 是怎么完成任务的？

不要在这里定义小说正文、人物设定等业务内容。
