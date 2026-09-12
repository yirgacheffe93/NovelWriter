# Web UI Framework

## 1. Purpose

本项目的 Web UI 是一个面向小说创作与续写的工作台。

核心目标不是构建普通聊天页面，而是构建一个类似 IDE 的小说创作环境：

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

整体交互参考现代 IDE，而不是普通 AI Chat 页面。

推荐参考的空间模型：

```text
Navigation                          Intelligence
────────────────                   ──────────────
Projects → Chapters → Editor ← Agent
    ←          ←              →
```

左侧负责内容导航。

右侧负责 Agent 能力。

中间负责实际创作。

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
│ Novel A     │ Chapter 01      │ Chapter Title          │ Continue        │
│ Novel B     │ Chapter 02      │                        │                 │
│ Novel C     │ Chapter 03      │ Novel Content...       │ Instruction     │
│             │ Chapter 04      │                        │                 │
│             │                 │                        │ Context         │
│             │                 │                        │ Plan            │
│             │                 │                        │ Generation      │
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

# 5. Agent Panel

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
- 删除项目
- 项目重命名

后续可以增加：

- Archive
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
- 删除章节
- 当前章节高亮

---

## 8.2 Chapter Order

章节必须有明确顺序。

例如：

```ts
Chapter {
  id
  projectId
  index
  title
  content
}
```

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

Agent 生成结果通过独立状态进入 Editor。

这样后续可以实现：

```text
Generate
↓
Preview
↓
Accept
↓
写入 Editor
```

而不是 Agent 直接修改正文。

---

# 12. Agent Panel

Agent Panel 是用户操作 Novel Agent 的主要入口。

第一版推荐结构：

```text
Agent

────────────────

Instruction

[ 继续写主角进入古城后的剧情        ]

Target Length

[ 2000 words ]

[ Continue ]

────────────────

Generation

正文……

[ Accept ] [ Retry ]

────────────────
```

---

# 13. Agent Panel Sections

Agent Panel 长期可以包含四个 section：

```text
Instruction

Context

Execution

Generation
```

未来：

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

# 14. MVP Agent Panel

第一版只实现：

## Instruction

用户输入自然语言要求。

例如：

```text
继续写下一章。

主角第一次进入古城，
需要有一种压抑和危险的感觉，
最后留下一个悬念。
```

---

## Target Length

例如：

```text
1000
2000
3000
```

可以允许自由输入。

---

## Continue

点击后发起 Agent Task。

状态：

```text
Idle

Preparing Context

Generating

Completed

Failed
```

---

# 15. Generation Preview

Agent 生成内容不能直接覆盖 Editor。

必须先进入 Preview。

例如：

```text
Generation

────────────────

夜幕完全落下的时候……

……

────────────────

[ Accept ]

[ Retry ]

[ Discard ]
```

---

## Accept

Accept 后：

```text
Generation
    ↓
检查 Chapter revision / contentHash
    ↓
原子保存 Chapter
    ↓
Generation disposition = accepted
    ↓
刷新 Chapter Editor
```

如果生成期间 Chapter 已被修改，Accept 显示 stale generation conflict，不能覆盖较新的正文。

---

## Retry

Retry 使用相同：

```text
Context
Instruction
Generation Settings
```

重新生成。

需要创建新的 AgentRun、LLMCall 和 Generation Record。新 Generation 通过 `parentGenerationId` 指向当前 Generation，旧 Run 保持 completed。

---

## Discard

Discard：

```text
丢弃当前 Preview
```

但后台可以保留 Generation Trace。

后台将 Generation disposition 更新为 `discarded`；旧 AgentRun 已经 completed，不随 Discard 改变。

---

# 16. Context View

虽然第一版可以不实现完整 Context Manager，但 UI 要提前预留 Context 区域。

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

每一个需要交给用户审阅的 Agent 输出都应该生成 Generation Record。内部 Planner / Reviewer 调用只记录 LLMCall。

例如：

```ts
Generation {
  id

  runId
  llmCallId

  output

  status
  disposition

  baseChapterRevision
  baseContentHash
  operation

  createdAt
  decidedAt
}
```

后续 UI 可以查看：

```text
Generation History

18:41 Continue
18:32 Retry
18:20 Continue
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

例如 Agent 请求失败：

```text
Generation failed.

[ Retry ]
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

## No Generation

Agent Panel：

```text
Tell the agent what you want to write next.
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
    ├── AgentInput
    ├── GenerationStatus
    ├── GenerationDisposition
    └── GenerationPreview
```

后续增加：

```text
AgentPanel

├── ContextView
├── PlanView
├── ExecutionView
├── GenerationPreview
└── GenerationHistory
```

---

# 23. Frontend State

至少需要维护以下状态：

```ts
currentProjectId

currentChapterId

projectSidebarCollapsed

chapterSidebarCollapsed

agentPanelCollapsed

chapterDraft

chapterSaveStatus

agentInstruction

agentStatus

currentGeneration

currentGenerationDisposition
```

`agentStatus` 对应 AgentRun 的执行状态；`currentGenerationDisposition` 对应用户对生成结果的处理状态，两者不能共用一个枚举。

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
/projects/novel-001/chapters/chapter-012
```

刷新页面后必须能够恢复到对应章节。

不要仅依赖 React 内存状态维护当前章节。

---

# 26. Suggested Technology

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

# 27. Responsive Strategy

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

# 28. Visual Style

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

聊天气泡式界面

过度动画
```

参考：

```text
VS Code
Linear
Notion
Cursor
```

但不要复制任何产品。

---

# 29. Interaction Priority

主要使用场景：

```text
打开项目
    ↓
选择章节
    ↓
阅读 / 修改正文
    ↓
输入续写要求
    ↓
Agent Generate
    ↓
Preview
    ↓
Accept
    ↓
继续编辑
```

整个 UI 必须围绕这个闭环优化。

---

# 30. MVP Development Order

Codex 应按以下顺序开发。

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
Agent API
```

完成：

```text
Instruction

Generate

Loading State

Generation Preview

Accept

Retry

Discard
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

# 31. MVP Acceptance Criteria

第一阶段 UI 完成后，用户必须能够完成以下流程：

```text
1. 打开应用

2. 选择一个小说 Project

3. 查看这个小说的 Chapters

4. 选择 Chapter

5. 阅读和编辑 Chapter

6. 输入续写要求

7. 点击 Continue

8. 查看生成结果

9. Accept 生成内容

10. 系统检查 Chapter revision 并保存正文

11. Editor 刷新为已保存内容
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

# 32. Non-Goals

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

# 33. Core Mental Model

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

而不是一个带小说功能的聊天机器人。
