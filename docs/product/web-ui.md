# Web UI Framework

# 1. Purpose

本项目的 Web UI 是一个面向小说创作与续写的工作台。

核心目标是「以 Editor 为主视图、右栏为 Agent 对话」的小说创作环境：

```text
Project → Chapter → Editor ← Agent
```

用户能够：

- 管理多个小说项目
- 管理小说章节
- 阅读和编辑章节正文
- 使用 Agent 续写或修改小说
- 查看 Agent 使用的上下文和执行过程
- 接受、重试或编辑生成结果

Web UI 只负责交互和展示。

Agent、Context Builder、LLM Client 等核心逻辑必须与 UI 解耦。

---

# 2. Design Principles

## 2.1 Editor First

Chapter Editor 是整个页面的视觉和交互中心。

左右侧栏都应该服务于 Editor，而不能挤占主要创作空间。

---

## 2.2 IDE-like Workspace

整体空间布局参考现代 IDE：左侧导航、中间编辑、右侧 Agent。

推荐参考的空间模型：

```text
Navigation                          Intelligence
────────────────                   ──────────────
Projects → Chapters → Editor ← Agent
    ←          ←              →
```

左侧负责内容导航。

右侧是 Agent 对话区，负责表达意图。

中间负责实际创作，是视觉与交互的中心。

---

## 2.3 Progressive Complexity

第一版只实现核心工作流。

不要在 MVP 阶段加入：

- 多 Agent
- Workflow Designer
- Graph Editor
- 复杂 Prompt 配置页面
- 向量数据库管理页面
- 多模型编排
- 权限系统
- 实时多人协作
- 复杂动画

后续能力应该随着 Agent Harness 演进逐步加入。

---

# 3. Main Layout

整体采用四栏布局：

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                              Top Bar                                     │
├─────────────┬─────────────────┬────────────────────────┬─────────────────┤
│ Projects    │ Chapters        │ Chapter Editor         │ Agent Panel     │
│             │                 │                        │                 │
│ Novel A     │ Chapter 01      │ Chapter Title          │ 你：继续写…     │
│ Novel B     │ Chapter 02      │                        │                 │
│ Novel C     │ Chapter 03      │ Novel Content...       │ Agent：夜幕…    │
│             │ Chapter 04      │                        │                 │
│             │                 │                        │                 │
│             │                 │                        │ [ 输入框 ] [ ↑ ]│
└─────────────┴─────────────────┴────────────────────────┴─────────────────┘
```

推荐宽度：

```text
Project Sidebar     220px
Chapter Sidebar     260px
Editor              flex: 1
Agent Panel         360px
```

最小桌面宽度优先考虑：

```text
1280px+
```

第一阶段不重点适配手机端。

---

# 4. Sidebar Collapse

## 4.1 Project Sidebar

Project Sidebar 支持向左折叠。

展开：

```text
┌──────────────┐
│ Projects     │
│              │
│ Novel A      │
│ Novel B      │
│ Novel C      │
└──────────────┘
```

折叠：

```text
┌────┐
│ 📚 │
│    │
│    │
└────┘
```

折叠后保留一个窄的 icon rail。

推荐折叠宽度：

```text
48px
```

---

## 4.2 Chapter Sidebar

Chapter Sidebar 同样支持向左折叠。

折叠之后：

```text
┌────┐
│ ☰  │
│    │
│    │
└────┘
```

Project Sidebar 与 Chapter Sidebar 必须可以独立控制。

例如：

```text
正常：

[ Projects ][ Chapters ][        Editor        ][ Agent ]


Project 折叠：

[ P ][ Chapters ][           Editor             ][ Agent ]


两个都折叠：

[ P ][ C ][              Editor                 ][ Agent ]
```

折叠操作不能改变当前选中的：

- project
- chapter

折叠只影响 UI Layout。

---

# 5. Agent Panel Collapse

Agent Panel 位于最右侧。

Agent Panel 支持向右折叠。

```text
Projects ←
Chapters ←

Editor

Agent →
```

折叠后保留：

```text
48px
```

的入口区域。

Editor 自动占用释放出来的空间。

---

# 6. Top Bar

Top Bar 第一版保持简单。

包含：

```text
Logo / Product Name

Current Project Name

Save Status

Optional:
Settings
Theme
```

示意：

```text
┌─────────────────────────────────────────────────────────────────┐
│ Novel Agent     长夜余火                       Saved      ⚙      │
└─────────────────────────────────────────────────────────────────┘
```

不要把大量操作放进 Top Bar。

---

# 7. Project Sidebar

Project Sidebar 负责小说级别导航。

---

## 7.1 Structure

```text
Projects

[ + New Project ]

Search...

● 长夜余火
  凡人修仙传
  雪中悍刀行

──────────────

Settings
```

---

## 7.2 MVP Features

支持：

- 创建项目
- 查看项目列表
- 切换项目
- 搜索项目
- 当前项目高亮
- 归档项目（Archive）
- 项目重命名

第一版不提供物理删除：项目只允许归档，归档后从常用列表隐藏。

后续可以增加：

- Favorite
- Tags
- Project Settings

---

## 7.3 Project Item

Project Item 第一版只展示：

```text
Project Name
```

后续可以增加：

```text
Project Name
Last Updated
Chapter Count
```

不要在第一版 Project List 展示太多 metadata。

---

# 8. Chapter Sidebar

Chapter Sidebar 负责当前 Project 内的章节管理。

示例：

```text
长夜余火

[ + New Chapter ]

卷一

01 灰土
02 苏醒
03 小队
04 出发

卷二

05 城市
06 遗迹
```

---

## 8.1 MVP Features

支持：

- 查看章节列表
- 创建章节
- 选择章节
- 修改章节标题
- 删除章节（仅限未被引用的章节）
- 当前章节高亮

删除章节是物理删除，只允许用于未被 Session、AgentRun、Generation 引用、也未保留任何 Harness Trace 的章节。被引用过的章节应从常用列表隐藏而不是删除。UI 必须二次确认。

---

## 8.2 Chapter Order

章节按 `ChapterMetadata.index` 升序排列。

`ChapterMetadata` 的权威定义见 [数据模型总览](../architecture/data-model/overview.md) 第 6 节，这里不再重复。UI 只依赖其中的 `index` / `title` / `status` / `wordCount` / `revision` / `contentHash`。

正文不在元数据里：Chapter content 的 Source of Truth 是 Markdown 文件。Editor 按 `filePath` 读取正文，写入前用 `revision` / `contentHash` 做并发校验。

UI 默认按照：

```text
index ASC
```

排序。

---

## 8.3 Future Features

后续可以增加：

- 拖拽排序
- 卷管理
- Chapter Status
- 字数
- Generation 状态
- Revision 状态

例如：

```text
01 灰土            ✓
02 苏醒            ✓
03 小队            Draft
04 出发            AI
```

第一阶段暂不实现复杂状态。

---

# 9. Chapter Editor

Chapter Editor 是整个应用最重要的区域。

---

## 9.1 Layout

顶部：

```text
Chapter Title

Chapter Metadata
```

正文：

```text
Content Editor
```

底部：

```text
Word Count
Save Status
```

示意：

```text
────────────────────────────────────────

第十二章 古城

1,842 words                     Saved

────────────────────────────────────────

夜色逐渐笼罩了整座城市……

正文……

正文……

────────────────────────────────────────
```

---

# 10. Editor Behavior

第一版 Editor 必须支持：

- 显示章节内容
- 编辑章节内容
- 修改章节标题
- 保存章节
- 字数统计

建议自动保存。

例如：

```text
用户停止输入 800ms
      ↓
Auto Save
```

UI 显示：

```text
Saving...
Saved
Save failed
```

---

# 11. Editor Architecture

不要把 Editor 与 Agent Generation 强绑定。

Editor 应该只是：

```ts
<ChapterEditor
  chapter={chapter}
  onChange={...}
  onSave={...}
/>
```

Agent 生成结果通过独立状态进入 Editor：

```text
Generate
↓
写入前校验 revision / contentHash
↓
写入 Editor
```

Agent 可以写正文，但只能经这条通道写入，不允许无条件覆盖。

---

# 12. Agent Panel

Agent Panel 是用户与 Novel Agent 对话的入口，位于最右侧。

第一版结构：

```text
Agent

────────────────

[ 消息流 ]

你 · 14:32
继续写主角进入古城后的剧情

Agent · 14:33 · 已写入正文
夜幕完全落下的时候……

[ 生成中... ]

────────────────

[ 输入框                        ] [ ↑ ]

Enter 发送 · ⇧Enter 换行 · ⌘Z 撤销

────────────────
```

对话区显示完整生成结果，同一份内容同时写入 Editor。

Agent Panel 不提供 Accept / Retry / Discard 按钮。生成结果自动写入正文；「重试」等同于再说一句；「丢弃」用 Editor 的 ⌘Z。

---

# 13. Agent Panel Sections

这是「面板分区」维度。Agent Panel 由两部分组成：

```text
对话区

输入区
```

消息流本身已经承载了 Instruction 与 Generation 的记录，不再单独分区。

后续会增加 Context 与 Execution 两个展示分区（见第 16、17 节），它们属于 Phase 5。

另一个维度是「Agent 执行流程」，它不等于面板分区，未来在 Execution View 中展示：

```text
Instruction
    ↓
Context
    ↓
Plan
    ↓
Execution
    ↓
Generation
    ↓
Review
```

但是 MVP 不必全部实现。

---

# 14. Agent Panel Input

本节只描述 MVP Agent Panel 的输入区；面板整体结构见第 12 节，MVP 范围以第 32 节验收标准为准。

## Instruction

用户在底部输入框里用自然语言描述要求。

例如：

```text
继续写下一章。

主角第一次进入古城，
需要有一种压抑和危险的感觉，
最后留下一个悬念。
```

---

## 发送

Enter 发送，Shift+Enter 换行。

发送后创建 AgentRun。

AgentRun 的持久化状态：

```text
pending

running

completed

failed

cancelled
```

UI 展示时可以在 `running` 内部细分，例如：

```text
Preparing Context

Generating
```

这些是依据 AgentEvent 派生的显示标签，不是持久化状态，不要写回 AgentRun。

---

## 生成参数

第一版不提供 Target Length 这类独立参数控件，字数、风格等要求直接写进指令文本。

这些内容属于请求内容，随 LLMCall 保存，Generation 不重复保存。

---

# 15. 生成与写入

生成结果不经过 Preview，直接写入 Chapter 正文。

写入方式按指令自动判断：

```text
"继续写 / 往下写"        → append，追加到正文末尾

"重写 / 改写 / 替换"     → replace，替换整章正文
```

判断依据属于 Harness。UI 不提供「追加还是替换」的控件。

---

## 写入前校验

写入是破坏性操作，并发保护必须保留，只是从「用户点 Accept 时」挪到「自动写入前」：

```text
Generation 生成完成
    ↓
校验 Chapter revision / contentHash 是否仍等于生成开始时的值
    ↓
一致   → 原子保存 Chapter，Generation disposition = applied
    ↓
不一致 → 不写入正文，Generation disposition = conflict
        并在对话中提示「正文已变更，本次生成未写入」
```

生成期间用户改过正文时，生成结果不会被写入，也不会覆盖较新的正文。

---

## 撤销

写入后正文只是一次普通编辑，撤销使用 Editor 的 ⌘Z。

撤销是纯前端行为，不落库；刷新页面后 undo 栈丢失。

---

## 重试

不提供 Retry 按钮。用户再说一句即可。

每一次发送都会创建新的 AgentRun、LLMCall 和 Generation Record。

UI 不再建立 Generation 之间的 `parentGenerationId` 关联，该字段保留供未来使用。

后台保留每一次 Generation，用于 Harness Trace 与失败分析。

---

# 16. Context View

属于 Phase 5。第一版不实现完整 Context Manager，也不在面板里预留区域。

例如：

```text
Context

✓ Novel Summary
✓ Character Profile

Recent Chapters

✓ Chapter 18
✓ Chapter 19
✓ Chapter 20
```

Context 默认折叠。

用户点击之后展开。

未来 Context View 可以显示：

```text
source

token count

selected content

priority
```

---

# 17. Agent Execution View

未来 Harness 增加执行过程后，Agent Panel 可以显示：

```text
Execution

Context Building      ✓

Story Planning        ✓

Writing               ...

Review
```

进一步可以变成：

```text
Context Builder
    1340 tokens

Planner
    420 tokens

Writer
    2380 tokens

Evaluator
    Score: 8.3
```

这一块第一阶段可以只实现简单 status。

---

# 18. Generation History

每一次写入正文的 Agent 输出都应该生成 Generation Record。内部 Planner / Reviewer 调用只记录 LLMCall。

会话内的历史由对话区本身呈现；跨会话的完整历史仍由 Generation 记录支撑。

`Generation` 的权威定义见 [数据模型总览](../architecture/data-model/overview.md) 第 16 节，这里不再重复。UI 只依赖其中的 `id` / `runId` / `role` / `output` / `status` / `disposition` / `operation` / `settledAt`。

`status` 表示模型生成是否成功；`disposition` 表示生成结果是否已进入正文，只允许从 `pending` 转为 `applied` 或 `conflict`。

后续 UI 可以查看：

```text
Generation History

18:41 继续写主角进入古城后的剧情
18:32 再压抑一点
18:20 重写这一段
```

点击可以查看：

```text
Instruction
Context
Prompt
Output
Model
```

其中 Instruction、Context、Prompt 和 Model 通过 `llmCallId` 查询 LLMCall，不在 Generation 中重复保存。

第一阶段可以不提供完整 History 页面，但数据结构必须支持。

---

# 19. Loading States

禁止只使用一个全局 spinner。

各区域应该有独立状态。

例如：

Project：

```text
Loading projects...
```

Chapter：

```text
Loading chapters...
```

Editor：

```text
Loading chapter...
```

Agent：

```text
Preparing context...
Generating chapter...
```

---

# 20. Error Handling

错误应该局部展示。

例如 Agent 请求失败时，错误显示在对话区里，正文不受影响：

```text
Agent · 18:41 · 生成失败

本次生成没有写入正文。再说一句即可重试。
```

不能因为 Agent API 失败导致整个页面崩溃。

需要处理：

```text
Project load failure
Chapter load failure
Save failure
Generation failure
Network failure
```

---

# 21. Empty States

## No Project

```text
No novels yet.

Create your first novel.

[ New Project ]
```

---

## No Chapter

```text
This novel has no chapters.

[ Create Chapter ]
```

---

## Empty Chapter

```text
Start writing...
```

---

## No Message

Agent Panel：

```text
告诉 Agent 你想写什么。
生成结果会直接写入编辑器，撤销用编辑器里的 ⌘Z。
```

---

# 22. Component Structure

推荐第一版组件结构：

```text
AppShell

├── TopBar
│
├── ProjectSidebar
│   ├── ProjectSearch
│   ├── ProjectList
│   └── ProjectItem
│
├── ChapterSidebar
│   ├── ChapterList
│   └── ChapterItem
│
├── ChapterEditor
│   ├── ChapterHeader
│   ├── Editor
│   └── EditorStatus
│
└── AgentPanel
    ├── ChatMessageList
    │   └── ChatMessage
    └── Composer
```

后续在 AgentPanel 下增加：

```text
ContextView

PlanView

ExecutionView

GenerationHistory
```

---

# 23. Frontend State

至少需要维护以下状态：

```text
currentProjectId

currentChapterId

projectSidebarCollapsed

chapterSidebarCollapsed

agentPanelCollapsed

chapterDraft

chapterSaveStatus

agentDraft

agentStatus

messages
```

`messages` 是当前 Session 的对话记录，属于 Server State。它不是持久化实体，而是由 AgentRun 与 Generation 投影得到的读取视图，字段与查询语义见 [Agent Runtime 模型](../architecture/data-model/agent-runtime.md) 第 3 节。

`agentStatus` 对应 `AgentRunStatus`：`pending` / `running` / `completed` / `failed` / `cancelled`。为 `null` 时表示没有进行中的 AgentRun。

UI 偏好（Sidebar 与 Agent Panel 折叠状态、Theme、最近打开的 Project）属于 UI State，持久化在浏览器 localStorage，不进入 Server State。详见 Persistence Model。

---

# 24. State Ownership

尽量区分：

```text
Server State
```

和：

```text
UI State
```

Server State：

```text
session
projects
chapters
chapter
generations
```

UI State：

```text
selected project
selected chapter
collapsed sidebar
draft
active panel
```

避免所有状态塞进一个大的全局 store。

---

## 24.1 Session

AgentRun 必须归属一个 Session（`agent_runs.session_id` 非空），因此 UI 在发起 Agent 任务前必须先拿到当前 Project 的 Session。

```text
打开 Project
    ↓
按 projectId 查找 active Session
    ↓
存在则复用，不存在则创建
    ↓
发送消息（创建 AgentRun）
```

Session 属于 Server State，持久化在 SQLite。

Session 只允许从 `active` 转为 `closed`，关闭前必须清空 `activeChapterId`。第一版 UI 不提供显式的关闭入口。

---

# 25. Routing

推荐第一阶段 URL：

```text
/
```

Project：

```text
/projects/:projectId
```

Chapter：

```text
/projects/:projectId/chapters/:chapterId
```

例如：

```text
/projects/project_xxx/chapters/chapter_xxx
```

刷新页面后必须能够恢复到对应章节。

不要仅依赖 React 内存状态维护当前章节。

---

# 26. Agent API

UI 不直接调用模型，也不直接操作 SQLite，而是通过 Harness 提供的 Agent API 访问 Agent 能力。

本节只约定 UI 依赖的最小操作集合；权威契约由 Harness 定义，本文档不做展开。

| Operation | 输入 | 输出 |
|---|---|---|
| Send | projectId, chapterId, instruction | runId, generationId |
| Get Run | runId | AgentRun 与 AgentEvent 列表 |
| List Generations | chapterId | Generation 列表 |
| List Messages | chapterId | ChatMessage 列表 |

约定：

- 服务端在写入正文前校验 `baseChapterRevision` 与 `baseContentHash`；不一致时不写入正文，Generation 记为 `conflict`
- 失败通过局部错误返回，不能导致整个页面崩溃
- 第一版不要求 streaming；后续可以增加事件流接口供 Execution View 使用

---

## 26.1 Workspace API

Agent 之外，UI 还需要一组业务读写操作。它与 Agent API 同层，不经过 LLM 模块。

| Operation | 输入 | 输出 |
|---|---|---|
| List Projects | — | Project[] |
| Create Project | name | Project |
| Rename Project | projectId, name | Project |
| Archive Project | projectId | Project |
| List Chapters | projectId | ChapterMetadata[] |
| Create Chapter | projectId, title | ChapterMetadata |
| Rename Chapter | chapterId, title | ChapterMetadata |
| Delete Chapter | chapterId | — |
| Read Chapter | chapterId | ChapterDocument |
| Save Chapter Content | chapterId, content, expectedRevision | ChapterMetadata |

约定：

- `Save Chapter Content` 必须携带 `expectedRevision`，不一致时返回冲突，不得覆盖正文
- `Delete Chapter` 只允许用于未被 Session / AgentRun / Generation 引用的章节
- Project 不提供物理删除，只有 `Archive`
- 返回的 `ChapterDocument` 是元数据与正文的组合视图，正文来自 Markdown 文件

---

# 27. Suggested Technology

项目采用 TypeScript。

推荐：

```text
Next.js
React
TypeScript
```

UI：

```text
Tailwind CSS
```

组件库可以选择：

```text
shadcn/ui
```

Icon：

```text
Lucide
```

Editor 第一阶段不要直接引入过重的编辑器框架。

如果只是纯文本 / Markdown：

```text
textarea
```

或者轻量 editor 即可。

后续确认需要：

- rich text
- inline AI
- block editing
- selection rewrite

之后再评估：

```text
TipTap
Lexical
ProseMirror
```

---

# 28. Responsive Strategy

第一阶段：

```text
Desktop First
```

目标：

```text
1280px+
```

窗口变窄时优先：

1. 自动折叠 Project Sidebar
2. 自动折叠 Chapter Sidebar
3. 必要时折叠 Agent Panel

始终优先保证 Editor 空间。

---

# 29. Visual Style

整体风格：

```text
clean
minimal
professional
editor-focused
```

避免：

```text
大面积渐变

复杂卡片

大量 Dashboard 图表

过度动画
```

右侧是对话区，但视觉上要保持 IDE 的克制：不要彩色气泡、不要头像、不要拟人化文案。

参考：

```text
VS Code
Linear
Notion
Cursor
```

但不要复制任何产品。

---

# 30. Interaction Priority

主要使用场景：

```text
打开项目
    ↓
选择章节
    ↓
阅读 / 修改正文
    ↓
在对话区提出要求
    ↓
Agent 生成并写入正文
    ↓
继续编辑（不满意就 ⌘Z，或再说一句）
```

整个 UI 必须围绕这个闭环优化。

---

# 31. MVP Development Order

## 31.1 阶段定义

文档里出现的「第一版」「第一阶段」「MVP」「Phase N」含义如下。

**MVP = 第一版 = Phase 1 到 Phase 4。** Phase 5 属于 MVP 之后。

| 阶段 | 内容 | 完成条件 |
|---|---|---|
| Phase 1 | 静态布局 | 四栏布局、两个 Sidebar 与 Agent Panel 可独立折叠、Editor 自动填充剩余空间；数据来自 mock |
| Phase 2 | 项目 / 章节导航 | 点击可切换项目与章节，URL 反映当前章节，刷新后仍处于同一章节 |
| Phase 3 | Editor 持久化 | 正文可读写，保存状态可见，并发保存有明确冲突处理 |
| Phase 4 | Agent 生成 | 对话可发送指令，生成结果经校验写入正文，可撤销 |
| Phase 5 | Agent Trace | Context / Execution / Generation History 视图（MVP 之外） |

**当前阶段：Phase 1 已完成，Phase 2 未开始。**

第 32 节的验收标准针对完整 MVP（Phase 4 结束），不是 Phase 1。

---

## 31.2 开发顺序

开发按以下顺序进行。

## Phase 1 — Static Layout

完成：

```text
TopBar

ProjectSidebar

ChapterSidebar

ChapterEditor

AgentPanel
```

先用 mock data。

要求：

- 四栏布局正常
- 左侧两个 Sidebar 可独立折叠
- Agent Panel 可向右折叠
- Editor 自动占用剩余空间

---

## Phase 2 — Project / Chapter Navigation

实现：

```text
Project List

Chapter List

Project Selection

Chapter Selection

Routing
```

---

## Phase 3 — Editor

实现：

```text
读取 Chapter

编辑正文

修改标题

字数统计

保存

Auto Save
```

---

## Phase 4 — Agent Generation

接入：

```text
Agent API（见第 26 节）
```

完成：

```text
对话区

消息发送

Loading State

生成结果写入 Editor

⌘Z 撤销
```

---

## Phase 5 — Agent Trace

增加：

```text
Context

Execution Status

Generation Metadata

Generation History
```

到这个阶段后，再进一步设计完整 Harness UI。

---

# 32. MVP Acceptance Criteria

MVP（Phase 1 到 Phase 4）完成后，用户必须能够完成以下流程：

```text
1. 打开应用

2. 选择一个小说 Project

3. 查看这个小说的 Chapters

4. 选择 Chapter

5. 阅读和编辑 Chapter

6. 输入续写要求

7. 在对话区发送指令

8. 查看 Agent 的回复

9. 系统检查 Chapter revision 并写入正文

10. Editor 显示新内容

11. 按 ⌘Z 可以撤销这次写入
```

同时：

```text
Project Sidebar
```

可以独立向左折叠。

```text
Chapter Sidebar
```

可以独立向左折叠。

```text
Agent Panel
```

可以独立向右折叠。

Editor 始终自动填满剩余空间。

---

# 33. Non-Goals

当前阶段明确不实现：

```text
Multiple Agents

Agent Graph

Workflow Editor

Prompt Marketplace

Vector Database UI

Model Management

Dataset Management

Training UI

Evaluation Dashboard

Multi-user Collaboration

Permissions

Billing
```

这些能力必须等核心小说创作闭环稳定之后再考虑。

---

# 34. Core Mental Model

整个 Web UI 始终围绕以下结构设计：

```text
Novel Workspace

Project
   ↓
Chapter
   ↓
Editor
   ↑
Agent
```

Project 和 Chapter 负责：

```text
What am I working on?
```

Editor 负责：

```text
What is the current content?
```

Agent 负责：

```text
What should happen next?
```

最终目标是构建一个：

```text
AI-native Novel Writing IDE
```

右侧是对话，但整个产品不是聊天机器人：正文是主体，对话只是驱动正文的方式。
