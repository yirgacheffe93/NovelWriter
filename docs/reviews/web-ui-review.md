# Web UI 问题与修复建议

审查范围：当前 Web UI 原型、相关数据模型与产品文档。

状态说明：本文是待办清单，不代表问题已经修复。优先级从 P0 到 P3 依次降低。

## 功能与数据安全

| ID | 优先级 | 问题 | 当前证据 | 修复建议 | 验收标准 |
|---|---|---|---|---|---|
| WEB-001 | P0 | Agent 生成期间用户编辑正文，生成完成后可能覆盖新内容 | `AppShell.handleSend` 没有记录生成开始时的 revision/hash，mock 的 replace 会直接覆盖最新正文 | 生成开始时保存 `baseChapterRevision` 和 `baseContentHash`；服务端写入前执行乐观并发校验，冲突时不写正文 | 自动化测试覆盖“生成中编辑正文”；最终正文保留用户修改，Generation 为 `conflict` |
| WEB-002 | P0 | 页面始终显示 Saved，但正文没有持久化 | Editor 和 TopBar 使用静态 Saved 文案，正文仅保存在 React state | 保存接入前显示 Demo/Unsaved；接入后实现 `dirty → saving → saved/failed` 状态机 | 编辑后立即显示未保存；保存成功后显示 Saved；失败时正文仍保留且可重试 |
| WEB-003 | P1 | 项目和章节无法切换 | 列表项为无事件处理器的 `div`，当前项目/章节由首页固定传入 | 使用 `Link` 或按钮完成选择，并以 `/projects/:projectId/chapters/:chapterId` 恢复路由状态 | 点击项目或章节后，URL、标题、正文和消息同步更新；刷新后仍处于同一章节 |
| WEB-004 | P1 | 章节切换后可能串用正文、消息和撤销快照 | `chapterContent`、`messages` 和 undo refs 只在 AppShell 首次初始化 | 以 chapterId 建立编辑会话边界；路由切换时重新加载或显式重建对应状态 | 在两个章节之间往返不会互相污染正文、消息或 undo 历史 |
| WEB-005 | P1 | 自动保存与 Agent 写入之间缺少双向并发处理 | 文档定义了 Agent 写入校验，但没有定义旧 draft 自动保存遇到新 revision 时的 UI 行为 | 所有正文保存都携带 `expectedRevision`；冲突后停止自动重试并提示重新加载/合并 | Agent 先写入后，旧 draft 的 autosave 不得覆盖新正文，并出现明确冲突提示 |
| WEB-006 | P1 | AgentRun 完成与 Generation 写入完成被合并成单一状态 | 数据流规定 `run.completed` 先于 `generation.applied/conflict`，UI 只有 `agentStatus` | 分别维护 AgentRun 状态和 Generation disposition，增加“正在写入正文”状态 | Run 完成但写入未落定时 UI 不显示最终成功；applied/conflict 后再展示明确结果 |
| WEB-007 | P1 | 撤销只修改前端，但 Agent 内容已经保存到服务端 | 产品文档规定 ⌘Z 为纯前端行为，刷新会丢失 undo 栈 | 撤销先恢复本地 draft，再通过正常 autosave 保存撤销后的正文 | 撤销并保存后刷新，生成内容不会重新出现；保存失败时有明确提示 |
| WEB-008 | P2 | 整章 replace 通过模糊关键词自动推断，误判代价较高 | mock 只要命中“重写、改写、替换”等词就替换整章 | MVP 默认只自动 append；整章替换要求明确意图，局部改写后续再实现 | 普通改写描述不会意外清空整章；整章替换操作可被准确识别和撤销 |

## 交互与界面

| ID | 优先级 | 问题 | 当前证据 | 修复建议 | 验收标准 |
|---|---|---|---|---|---|
| WEB-009 | P1 | 窄窗口下 Editor 被固定侧栏严重挤压 | 三个展开栏固定占用 840px；1024px 视口下 Editor 只剩约 150px | 为 Editor 设置最低可用宽度；空间不足时依次折叠 Project、Chapter、Agent | 1280px 下 Editor 保持主要工作区；1024px 下不会出现不可用的窄文本列 |
| WEB-010 | P2 | 项目创建、章节创建、搜索和设置呈现为可用控件但没有行为 | 按钮没有业务回调，搜索框为 readOnly | 原型阶段明确禁用或标注 Demo；进入对应阶段后再启用真实交互 | 不存在“看起来可点但无响应”的控件 |
| WEB-011 | P2 | 归档项目仍显示在*常用项目*列表 | mock 中 archived 项目仍由 ProjectSidebar 直接渲染 | 默认过滤 archived；以后单独提供归档入口 | 默认项目列表不显示归档项目，归档数据仍可从专门入口访问 |
| WEB-012 | P2 | 消息时间直接显示 UTC 字符串片段 | `createdAt.slice(11, 16)` 没有转换本地时区 | 使用 `Intl.DateTimeFormat` 按用户时区格式化 | 同一时间戳在 Asia/Shanghai 显示正确本地时间 |
| WEB-013 | P2 | 异步与空状态覆盖不完整 | 目前只有 Agent pending/running 文案，没有项目、章节、保存或网络错误状态 | 按区域实现 loading、empty 和 error，不使用全局 spinner | 任一区域失败不导致整个页面崩溃，并能就地重试 |
| WEB-014 | P2 | 导航与状态提示的可访问性不足 | 项目/章节行不可键盘操作，异步状态没有 live region，按钮缺少明显 focus 样式 | 使用语义化 Link/button、`aria-current`、`aria-live` 和 `focus-visible` | 仅使用键盘可以完成导航和发送；读屏可获知保存与生成状态 |
| WEB-015 | P3 | UI 中英文文案混用 | Projects、Saved、Agent 与中文正文和提示同时出现 | 确定 MVP 主语言并集中维护用户文案 | 同一界面的核心操作、状态和空案使用统一语言 |

## 文档与工程保障

| ID | 优先级 | 问题 | 当前证据 | 修复建议 | 验收标准 |
|---|---|---|---|---|---|
| DOC-001 | P1 | “第一版、第一阶段、MVP、Phase 1”含义不统一 | Phase 1 定义为静态布局，但 MVP 验收已经覆盖导航、保存和 Agent 写入 | 在产品文档顶部增加当前阶段表，并为每个 Phase 写明进入/完成条件 | 阅读文档可以直接判断当前已经完成和尚未完成的范围 |
| DOC-002 | P1 | Chapter 在不同文档中存在不同结构 | 领域文档的 Chapter 包含 content，主数据文档和前端类型将 content 独立保存 | 明确区分 `ChapterMetadata` 与 `ChapterDocument`，主数据文档作为权威定义 | 相同类型名称不再代表不同字段集合，代码类型可以直接映射文档 |
| DOC-003 | P1 | ChatMessage 的来源和持久化方式不明确 | Web UI 将 messages 称为 Session Server State，但数据模型没有 ChatMessage 实体 | 明确它是持久化实体还是由 AgentRun、LLMCall、Generation 投影得到，并定义查询 DTO | `List Messages` 的排序、Session/Chapter 范围和字段来源都有唯一说明 |
| DOC-004 | P2 | UI API 只描述 Agent 操作 | Agent API 表缺少 Project/Chapter 的读取、创建、重命名、归档和保存契约 | 增加 Workspace API 小节，定义 UI 所需的最小业务操作 | Phase 2/3 所有交互都能映射到明确接口和错误模型 |
| DOC-005 | P2 | 多份数据模型文档存在重复内容和漂移风险 | 总览与五份专题文档重复定义接口和状态 | 总览保留权威结构；专题文档侧重解释并链接权威定义 | 修改核心字段时只有一个权威定义位置，文档检查不会出现冲突 |
| ENG-001 | P1 | 缺少关键业务测试 | package scripts 只有 lint/build，没有 test | 为并发保存、Agent apply、append/replace、导航恢复和撤销增加最小测试集 | `npm test` 可复现并保护 WEB-001、003、004、005、006、007 |
| ENG-002 | P3 | 默认构建依赖在线下载 Google Fonts | `next/font/google` 会在无网络环境下导致构建失败 | 自托管 Geist，或改用可靠的系统字体栈 | 断网环境能够完成生产构建 |

## 建议实施顺序

| 阶段 | 范围 | 关联问题 |
|---|---|---|
| 1 | 统一文档术语、类型和 API 契约 | DOC-001～005 |
| 2 | 完成项目/章节路由和状态隔离 | WEB-003、004、010、011 |
| 3 | 接入正文持久化、保存状态和并发控制 | WEB-001、002、005、007 |
| 4 | 接入真实 AgentRun/Generation 状态 | WEB-006、008、013 |
| 5 | 补齐响应式、可访问性和语言一致性 | WEB-009、012、014、015 |
| 持续 | 为每个阶段补充相应自动化测试 | ENG-001、002 |
