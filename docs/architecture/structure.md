# 代码结构设计

## 1. Purpose

这份文档是**代码结构的唯一权威定义**。

其他文档不再各自推荐目录结构，只说明自己那一层放在哪里，并链接回本文件。

分层的目的是让每段代码有唯一该去的地方，并让"agent 与小说业务解耦"这条约束可以被检查，而不是靠记忆维持。

---

## 2. 分层

| 层 | 职责 | 一行判据 |
|---|---|---|
| `ui/` | 界面：React 客户端组件 | 只在浏览器运行 |
| `actions/` | 传输：UI 与服务端之间唯一的入口（`"use server"`） | 只做参数校验与转发，不含业务判断 |
| `agent/` | Agent 运行时：回合循环、事件、工具执行、prompt 装配、skills 加载 | 不含任何小说概念 |
| `llm/` | 模型调用：契约、服务、供应商适配 | 只回答"怎么调模型" |
| `novel/` | 小说业务，以及它自己的 agent 资产（prompt / skills / tools） | 只回答"小说是什么、怎么写" |
| `storage/` | 基础设施：SQLite 连接与迁移 | 不知道上层有谁 |

`agent/` 与 `llm/` 的分界沿用 [LLM 模块](llm.md) §26：

```text
agent/   Why and when to call the model
llm/     How to call the model
novel/   What business data is being processed
storage/ Where the data is stored
```

---

## 3. 依赖方向

```text
app/  (Next.js 路由)
  │
  ├──► actions/
  │       │
  │       ├──► agent/ ──► llm/ ──► storage/
  │       │
  │       └──► novel/ ──► storage/
  │                │
  │                └──► agent/        (仅工具的类型定义)
  │
  └──► ui/ ──► actions/               (服务端调用只经 "use server")
        │
        └──► novel/                   (仅纯类型与纯函数，不含 node: 依赖)
```

规则只有一条：

```text
agent/ 永远不 import novel/
```

方向是单向的：`novel/` 可以依赖 `agent/`（像插件依赖框架），反过来不行。

**`ui/` 可以 import `novel/` 的纯类型与纯函数**（如 `types.ts`、`word-count.ts`），但不能 import 任何带 `node:` 依赖的服务端模块——后者只能经 `actions/` 到达。这条由 Next.js 的 client/server 边界强制，目录规则只是让它可见。

**业务进入 agent 的唯一途径是参数**——prompt 文本、skill 内容、工具实例由 `novel/` 提供，由 `actions/` 装配后传给 `agent/`。`agent/` 不需要知道它们描述的是小说。

这条规则靠目录约定维持。若将来出现违反它也无所谓的场景，再考虑加 lint 规则，现在不加。

导入写法：跨层用别名 `@/`（指向 `src/`），同层内用相对路径。

---

## 4. 业务如何进入 Agent

三条通道，按"多久适用一次"分配：

| 规则适用于 | 放哪 | 位置 |
|---|---|---|
| 大多数轮次都适用 | 静态 prompt | `novel/prompt.ts` |
| 少数请求才需要的多步流程 | skill，按需加载 | `novel/skills/*/SKILL.md` |
| 一次调用的参数怎么填 | 该工具的描述 | `novel/tools.ts` |

约束：

- 不要把大多数轮次都适用的规则塞进 skill，也不要把单个工具的规则写进 prompt。
- 静态 prompt 与工具列表在同一部署内逐字节稳定；每请求变化的数据放独立的上下文块，且**先排序**再渲染，否则每个回合都会失效。
- **业务数据按"是否每轮都需要"分配**：每轮都要的（最近章节、时间线）进上下文块；不一定的（人物、facts、更早的章节）做成工具让模型按需读，不预取。选择策略见[数据结构总览](data-model/overview.md) §24。

---

## 5. 目录

```text
app/                          Next.js 路由（框架要求，不承载业务）
src/
├── actions/                  服务端 Action：UI 的唯一入口
│   ├── llm.ts
│   └── workspace.ts
│
├── ui/                       客户端组件
│   └── workspace/
│
├── agent/                    域无关内核
│   └── turn.ts               一个回合：装配请求、调用模型、处理结果
│                             ← events.ts / tools.ts 等按需新增
│
├── llm/                      模型调用（对齐 llm.md §4）
│   ├── types.ts
│   ├── client.ts
│   ├── service.ts
│   ├── config.ts
│   ├── errors.ts
│   ├── call-repository.ts
│   ├── settings-repository.ts
│   └── providers/
│       └── litellm.ts
│
├── novel/                    小说业务 + 它的 agent 资产
│   ├── types.ts
│   ├── word-count.ts
│   ├── project-repository.ts
│   ├── chapter-repository.ts
│   ├── txt-import.ts
│   ├── prompt.ts             ← 写 agent 时新增
│   ├── tools.ts              ← 写 agent 时新增
│   └── skills/               ← 写流程时新增
│
└── storage/                  基础设施
    ├── db.ts
    └── migrations/
```

`novel/prompt.ts`、`novel/tools.ts`、`novel/skills/` 现在不存在。它们属于 `novel/` 而不是 `agent/`：描述的是"怎么写小说"。`agent/` 只提供装配与执行它们的能力。

`agent/` 下不预建空模块——`events.ts`、`tools.ts` 等到真有内容时再加。

---

## 6. 明确不做的事

以下都**不建**，直到出现第二个真实消费方：

```text
Backend / Repository 抽象基类
PresentationExtension 式的 UI 插件注册表
Delegate / 子 Agent 扩展机制
interface 与 implementation 的目录级分离
```

理由：没有第二个消费方时，无法判断该抽什么，抽出来的接口大概率是错的。参考实现（`anthropics/commerce-agents`）抽这些是因为它要覆盖 2 个角色 × 4 个垂类；本项目的业务只有一个。

**接口分离可以推迟，依赖方向不能推迟**——前者错了要重写，后者错了只是多绕一层。

---

## 7. 现状与目标

目录迁移已完成，代码位置与 §5 一致：

| 层 | 现状 |
|---|---|
| `ui/` | `src/ui/workspace/` |
| `actions/` | `src/actions/llm.ts`、`src/actions/workspace.ts` |
| `agent/` | `src/agent/turn.ts`——只有一个回合的骨架：装配请求、调用模型、返回文本 |
| `llm/` | `src/llm/`，含 `providers/litellm.ts` |
| `novel/` | 业务类型与仓储已有；`prompt.ts`、`tools.ts`、`skills/` 未开始 |
| `storage/` | `src/storage/`，含 `migrations/` |

层已经就位，但**层内的东西大多还没有**。下一步要实现的（判据见[数据结构总览](data-model/overview.md)）：

```text
novel/prompt.ts        静态文本与每请求上下文块
novel/skills/          续写、改写、审校等流程
novel/tools.ts         读章节、读人物、读记忆
agent/                 工具执行、事件、prompt 装配
novel/ 的记忆仓储      timeline / facts（派生，可重建）
写回正文的路径         复用已有的 revision 乐观并发校验
```

---

## 8. Core Rule

新增一个文件前，只问一个问题：

```text
它属于哪一层？
```

答不上来，说明这一层还没想清楚，先补这份文档，再写代码。
