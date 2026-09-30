# Agent / Harness 层评审：对照 anthropics/commerce-agents

评审日期：2026-09-30。参考项目：[anthropics/commerce-agents](https://github.com/anthropics/commerce-agents)（Apache-2.0，本地只读克隆分析）。

范围：**Agent / Harness 层**——即"模型看到什么、怎么调用、结果怎么回到正文"。`code-review.md` 已覆盖工作台持久化与 TXT 导入的数据风险，`web-ui-review.md` 是更早的原型评审，本文不重复它们的结论。

前置说明：本文是评审，不是实施计划。**未改动任何代码**；下文每条建议都标注了验收方式，是否实施由你决定。

> 状态更新（2026-09-30）：代码已按[代码结构设计](../architecture/structure.md)迁移到 `src/`，正文中的 `features/...` 是迁移前的位置。**P0-1 已修复**——修 `service.ts` 时发现该文件从写下起就没跑过，加载失败还掩盖了一个外键约束缺陷。P0-2、P0-3 及其余各项均未动。

---

## 1. 结论

三句话：

1. **LLM 管道层做得比大多数项目好，可以留着不动。** 契约（`client.ts`，16 行）、错误归一化（`errors.ts`）、超时与取消转发、费用归一化、`llm_calls` 的状态机（含 SQL CHECK 约束）都是对的。参考项目在同等位置上并没有做得更细。
2. **Agent 层还不存在。** 当前 `sendAgentChatAction` 发出的是纯聊天历史：没有 system prompt，没有当前章节正文，没有项目设定，没有工具，没有流式，没有写回正文的路径。它也**看不到用户正在写的那一章**——对一个"小说撰写 Agent"来说这是最要紧的缺口。
3. **最值得优化的不是"补功能"，而是把已经写在 6458 行文档里的设计，换成参考项目那种几百行就能跑起来的形态。**

参考项目的对照数据：

| | commerce-agents | NovelWriter |
|---|---|---|
| 共享 agent 核心 | 3540 行（`commerce-common/commerce_common/`） | — |
| "一条工作流"的载体 | 一个 ~35 行的 `SKILL.md`，5 个流程共 180 行 | 设计上由 Session / AgentRun / Generation / AgentEvent 四个运行时对象（对应 4 张未落地的表）承载 |
| 静态 prompt + 工具契约 | 逐字节恒定，构造期建一次 | 尚无 prompt |
| 文档 : 非测试源码 | 448 行文档 / 26117 行 ≈ **1:58** | 6458 行文档 / 4338 行 ≈ **1.5:1** |

（最后一行不该被读成"文档太多就是错"——见 §4.7 的分寸说明。它的意思是：本项目的设计文档已经远远跑在实现前面，需要标记清楚哪些是现状、哪些是提案。）

---

## 2. 本次核对的事实（可复现）

| 检查 | 命令 | 结果 |
|---|---|---|
| 测试 | `npm test` | **20 通过 / 1 失败**，退出码非 0 |
| 类型 | `npx tsc --noEmit` | 通过 |
| 静态检查 | `npm run lint` | 通过 |
| CI | `.github/` | 不存在 |

测试失败的根因已定位，是环境不兼容而非逻辑错误：

```text
features/llm/service.ts:28
  constructor(private readonly client: LLMClient, ...)
SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]:
  TypeScript parameter property is not supported in strip-only mode
```

`features/llm/litellm-client.test.ts`、`settings.test.ts`、`txt-import.test.ts` 全部通过；只有 `service.test.ts` 因为 import 了 `service.ts` 而在加载期就崩掉，4 条验收用例一条都没跑。

其余静态核对：

- `docs/architecture/data-model/overview.md` 定义了 6 张表，`features/workspace/server/migrations/` 只有 4 个迁移，缺 `sessions`、`agent_runs`、`generations`、`agent_events`。
- `observability.md` 776 行，代码中结构化日志为 0，只有 14 处 `console.error`。
- `README.md:7` 结尾仍是"Agent 尚未接入真实模型"，而 `AgentPanel` 已经通过 LiteLLM 调真实模型。
- `docs/references.md` 只有一行 URL 且无换行，被 `README.md` 与 `docs/README.md` 当作"参考资料"索引。

---

## 3. 参考项目中真正值得迁移的机制

只列与小说写作直接相关的六条，其余（支付、审批、商品目录）不适用。

| 机制 | 参考实现 | 为什么对小说写作成立 |
|---|---|---|
| **静态 / 每请求 prompt 二分** | `prompt_assembly.py:33-40` | 小说每轮要带整章甚至整书上下文；前缀不稳等于每轮全额重算。这条在长篇场景的收益比电商大得多 |
| **流程 = 一个 Markdown 文件** | `skills.py:28-40`（加载器 86 行） | "续写 / 改写 / 审校 / 摘要 / 一致性检查"就是五条流程，各自 30-40 行规则即可，不需要为每条流程建表 |
| **接地：先读再答** | `grounding.py:62-82` | "这一章讲了什么"必须先读到正文才能答。规则是数据（`fires(config, text, state)`），不是 prompt 里的一句请求 |
| **内容围栏** | `fencing.py`（189 行） | 导入的 TXT 是第三方文本。小说正文里出现 `忽略以上指令`、`<system>`、`\n\nHuman:` 是**正常情节**，不是攻击，但同样会污染 prompt |
| **展示层：模型选，服务端填** | `presentation.py:120-144` | "人物卡 / 章节摘要卡 / 伏笔清单"应由服务端从项目数据组装，模型只给 id 与一句判断，避免模型编造人物设定 |
| **假件放在模型客户端接缝上** | `testing.py:130-144` | 已有的 `FakeClient`（`service.test.ts:24-37`）就是正确位置，应当沿用 |

`scripts/check.py` 的漂移检测（要求 prompt builder 的每条规则出现在派生文档里，否则必须显式声明 `adapted:` / `omitted:`）是这套工程最值得学的一条，见 §4.7。

---

## 4. 值得优化的点

### P0-1：`npm test` 是红的，修它

- **证据**：`features/llm/service.ts:28` 使用 TypeScript 参数属性，Node 的类型剥离模式不支持。
- **改法**：改成显式字段声明与赋值（3 行），不碰其他任何东西。
- **验收**：`npm test` 退出码 0，`service.test.ts` 的 4 条用例真正执行。
- **理由**：这是当前唯一的自动化回归网，它在加载期就崩，等于没有。修复成本几乎为零。

### P0-2：Agent 看不到正文

- **证据**：`features/llm/actions.ts:93-104` 只发 `messages: input.history`；`AgentChatMessage` 只有 `user` / `assistant` 两种角色。`chapterId` 被传进来，但只用于写 `llm_calls` 的外键，正文从未进入请求。用户问"帮我续写这一章"，模型看不到这一章。
- **这是产品定位问题，不只是缺功能。** 一个看不到稿子的写作 Agent，和一个通用聊天框没有区别。
- **最小落地**：给 `sendAgentChatAction` 的入参加一个显式上下文块——当前章节正文 + 项目 `premise.md` / `outline.md`（若存在）——包在固定标签里，作为 `system` 消息放在对话之前。
- **不要**为此先建 `sessions` / `agent_runs` 表。参考项目证明接地的核心是"请求里有没有那段文本"，与持久化无关。
- **验收**：问"这一章讲了什么"能基于正文回答；`llm_calls.request_json` 里能看到正文；正文不进入任何 `console` 输出。

### P0-3：密钥边界与 `../architecture/llm-integration-plan.md` 明文矛盾

- **证据**：三处互相冲突——
  - `../architecture/llm-integration-plan.md:74`："API key 与 Authorization header 永不入库"；
  - `features/llm/server/settings-repository.ts:33-50` 把 `llm.apiKey` 明文写入 `app_settings`；
  - `features/llm/actions.ts:32` 把 `stored.apiKey ?? env.LITELLM_API_KEY` 原样**返回给浏览器**。
- **影响**：部署者通过环境变量配置的密钥，会被任意客户端调用 `getLlmSettingsAction` 读回。`004_create_app_settings.sql` 的注释试图论证"这是用户主动配置的生效值，不是调用记录"，但这条论证只覆盖了"入库"，没有覆盖"回显给浏览器"。
- **我的判断**：这是本地单机工具，磁盘加密没有可用的密钥，属于**伪安全**，所以不建议"改成加密存储"。建议**改文档 + 加掩码**：明确写出"Settings 保存的网关参数含 API key，明文存于本地 `app_settings`，这是单机场景的有意选择"，同时 `getLlmSettingsAction` 只回显掩码（`sk-…abcd`），编辑框留空表示"不修改"。
- **验收**：文档与实现一致；浏览器端拿不到完整密钥。

### P1-4：prompt 分层与稳定前缀（现在是窗口期）

现在还没有 system prompt，所以这是"从第一天把结构立对"的最便宜时刻。

- **可迁移的纪律**（`prompt_assembly.py`）：
  1. 静态文本（身份 + 写作规则 + 流程索引）与 `tools[]` 逐字节恒定，构造期生成一次；
  2. 每请求数据（当前章节、选中文本、时间）放**第二个** system 块，位于静态块之后；
  3. 任何迭代进 prompt 的集合（人物表、大纲节点）必须**先排序**——参考项目的 `SkillRegistry` 按 name 排序就是为了这个（`skills.py:68`）；
  4. 时钟截到整点或更粗（`context_clock`，`prompt_assembly.py:25-30`），否则每轮都变。
- **重要的利弊说明，别照抄**：参考项目用的是 Anthropic 的显式 `cache_control` 断点。NovelWriter 走 LiteLLM → OpenAI 兼容端点，前缀缓存多为**自动**生效。所以要迁移的是"前缀稳定"的**纪律**，不是 `cache_control` 字段。真要开缓存参数，应在 LiteLLM 网关侧按供应商注入，而不是写死进 `LiteLLMClient`。
- **验收**：同一会话连续两轮，第二轮的输入 token 数明显低于第一轮的全量（或网关侧 cache 命中计数 > 0）。

### P1-5：流式输出

- **证据**：`features/llm/client.ts` 只有 `generate()`。写小说是长文本生成，非流式意味着用户全程盯着"生成中…"。
- **方向与既有设计一致**：`docs/architecture/llm.md §20` 已经预留了 `LLMStreamChunk` 与"Provider Stream → LLMClient → Normalized Stream → LLMService → UI"的分层，且明确要求 Agent 不直接处理供应商 stream。
- **最小落地**：`LLMClient` 增加 `generateStream()`，`LiteLLMClient` 解析 SSE，事件只用三个：`text_delta` / `error` / `turn_complete`。参考项目的完整事件信封有 10 种（`streaming.py:39`），其中 `cart_update` / `change_update` / `ui_partial` 对小说场景是多余的，不要一次搬完。
- **验收**：首 token 在可感知的短时间内出现；取消按钮能中断并留下 `failed` 的 `llm_calls` 记录。

### P1-6：Agent 结果回到正文的路径

- **证据**：`features/llm/actions.ts` 返回 `{ content }` 后流程即结束；全仓库没有任何从 agent 输出写入章节的代码，也没有 `Generation` / `disposition` 的实现。而 `overview.md §16.1` 与 `agent_runtime.md:53` 为 `applied` / `conflict` 写了大量篇幅。
- **已经有一半了**：`features/workspace/server/chapter-repository.ts:171-211` 的 `saveChapterContent` 就是所需的乐观并发校验（`expectedRevision` + 条件 UPDATE + 冲突不触碰正文）。这正是 Generation 落地需要的那个检查，不需要新建表。
- **最小落地**：agent 回复下方加"插入到光标处 / 替换选中"，走已有的 `saveChapterContentAction`。生成期间用户改了正文 → revision 冲突 → 已有错误路径生效，用户修改保留。
- **验收**：自动化测试覆盖"生成中编辑正文"，最终正文保留用户修改且冲突被明确提示。这条正是 `web-ui-review.md` 的 WEB-001，可以在**不建 `generations` 表**的前提下满足。

### P1-7：文档规模失衡与漂移

- **证据**：文档 6458 行 vs 源码 4338 行；4 张表只有 DDL；`observability.md` 776 行对应 0 行日志代码；`README.md:7` 与 `docs/references.md` 已过时。
- **需要注意分寸**：设计文档先于实现存在是**合理**的，`docs/README.md` 的维护约定也写得清楚。真正的问题不是"文档太多"，而是**没有标记哪些是已实现、哪些是提案**，于是读者（包括下一个 AI）无法判断可信度，漂移也无法被发现。
- **最小落地**（借鉴 `scripts/check.py`）：给架构文档顶部加一个状态标记（`已实现` / `部分实现` / `设计提案`），并在 `docs/README.md` 的维护约定里加一条"派生文档必须与代码同源，或在文件头声明偏离"。**不要**现在写漂移检查脚本——等文档进入"派生"状态（例如 `system.md` 那种由代码生成的文件）再上脚本才有意义。
- **验收**：任取一份架构文档，能在 5 秒内判断它描述的是现状还是提案。

### P2-8：测试策略与最小 CI

- **证据**：4 个测试文件、20 条通过的用例、`npm test` 红、无 CI；`features/llm/service.ts` 与 `AgentPanel` 之间的 agent 逻辑无任何测试。
- **参考项目的做法**（`testing.py`、`conftest.py`）：把假件放在两个接缝上——模型客户端、数据后端——其余跑真实代码；脚本耗尽的 `FakeClient` 主动抛 `AssertionError`，让失控循环变成**测试失败**而不是挂死；测 LLM 行为时断言**请求**与**事件流**，不比对模型输出文本。
- **最小落地**：沿用 `service.test.ts:24-37` 的 `FakeClient` 模式到 agent 层；加一个 CI job（`tsc --noEmit` + `lint` + `test`）。
- **验收**：CI 在 PR 上跑绿。

### P2-9：可观测性从 776 行文档收敛成一个小查询

- **证据**：`llm_calls` 已经在记录完整请求 / 响应 / 用量 / 耗时 / `runId`——这已经**强于**参考项目的日志方案。
- **缺的只有一件事**：一次 Agent 回合的多次 LLM 调用如何聚合。参考项目用 `runId` + `usage_totals` 求和（`turn.py`）。
- **最小落地**：按 `runId` 聚合 tokens / cost / latency 的一个查询函数。**不要**实现 `observability.md` 的全套设计。
- **验收**：能回答"上一次问答花了多少钱、多少 token、多少毫秒"。

---

## 5. 明确不建议照搬的部分

按 `Agents.md` 的"简单优先"，以下都是参考项目**有**但 NovelWriter 现在**不该有**的东西：

| 不建议 | 理由 |
|---|---|
| 先建 `sessions` / `agent_runs` / `generations` / `agent_events` 四张表 | 参考项目的核心 agent 没有这些表也能跑完整回合。表是**事后**为了查询与审计才需要的；先建会锁死还没验证的设计 |
| 引入 Python 栈 / Claude Agent SDK / 三套 runtime | 参考项目是 Python + MCP，本仓库是 Next.js + LiteLLM。照搬跨语言包结构（`commerce-common` / `runtime-*`）会产生纯维护成本 |
| 记忆抽取（参考项目 `memory.py` 666 行 + 独立模型调用 + 写过滤器） | "记住作者偏好"的价值远低于"Agent 能看到正文"。等 P0-2 做完、且确有需求再评估 |
| 多 Agent 委派 / analysis delegate / 嵌套 subagent | 小说写作的瓶颈在单章生成质量，不在任务分解 |
| 20 条 safety 规则与三层 `enable_*` 开关 | 大部分是电商专属（下单、审批、disclosure）。小说场景需要的是其中**两条**：围栏与"先读再答" |
| `ui_partial` / 结构增量节流 / 骨架屏（`Bones.tsx`、`drip` 队列） | 这些服务于"卡片有 12 个字段、逐项到达"的电商场景。小说输出是纯文本流，用不上 |

---

## 6. 建议的落地顺序

每条都可独立验收，前一条不完成不影响后一条是否值得做。

| 顺序 | 动作 | 验收 | 规模 |
|---|---|---|---|
| 1 | 修 `service.ts` 的参数属性 | `npm test` 退出码 0 | 3 行 |
| 2 | Agent 接地：静态 system 块 + 当前章节上下文块 | 能基于正文回答；正文不落日志 | 小 |
| 3 | 密钥口径统一 + 回显掩码 | 文档与实现一致；浏览器拿不到完整密钥 | 小 |
| 4 | 流式输出（三个事件） | 首 token 及时出现；可取消 | 中 |
| 5 | Agent 输出写入正文（复用已有 revision 校验） | 生成中编辑 → 冲突被拒，用户修改保留 | 中 |
| 6 | 按 `runId` 聚合用量查询 | 能报出一次问答的 token / 费用 / 耗时 | 小 |
| 7 | 最小 CI + 文档状态标记 | CI 跑绿；文档可判断现状/提案 | 小 |

第 2 步做完之后，"流程 = `SKILL.md`"（§3 第二条）才有落点——届时应按参考项目的写法约束描述：**只写请求类别，不写示例话术**，并用否定边界（`不适用于…`）与其他流程互斥。参考项目用脚本强制"描述 ≥ 40 字符、正文 ≥ 200 字符"来防止空壳流程，这条可以直接采用。

---

## 7. 证据索引

本仓库：

- `features/llm/service.ts:28`（参数属性）、`features/llm/service.test.ts:24-37`（FakeClient）
- `features/llm/actions.ts:25-36`（密钥回显）、`:93-104`（无 system、无正文）
- `features/llm/server/settings-repository.ts:33-50`、`features/workspace/server/migrations/004_create_app_settings.sql`
- `features/workspace/server/chapter-repository.ts:171-211`（可复用的乐观并发校验）
- `../architecture/llm-integration-plan.md:74`、`README.md:7`、`docs/architecture/llm.md §20`、`docs/architecture/data-model/overview.md §13-20`

参考仓库（路径相对 commerce-agents 根）：

- `commerce-common/commerce_common/prompt_assembly.py:25-40,113-118`（缓存断点与时钟）
- `commerce-common/commerce_common/skills.py:28-40,64-86`（86 行加载器与索引）
- `commerce-common/commerce_common/grounding.py:62-82`（规则即数据）
- `commerce-common/commerce_common/fencing.py`（189 行围栏）
- `commerce-common/commerce_common/presentation.py:120-144`（服务端校验 + 填充）
- `commerce-common/commerce_common/testing.py:130-144`、`conftest.py`（假件与接缝）
- `scripts/check.py:653-683`（派生文档漂移检测）
- `plugins/commerce-builder/skills/commerce-architecture/SKILL.md`（"规则住在哪一层"的权威表）
