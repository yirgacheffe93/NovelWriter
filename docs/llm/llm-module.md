# LLM Module Design

## 1. Purpose

LLM 模块负责统一管理项目中的所有大模型调用。

目标：

- 对 Agent / Harness 屏蔽具体模型供应商差异
- 提供统一的模型调用接口
- 统一接入 LiteLLM
- 记录每一次 LLM 调用
- 记录 token、latency、cost、error
- 支持后续扩展 streaming、retry、fallback、多模型

核心原则：

```text
Agent 负责 orchestration

LLM 模块负责 inference
```

Agent 不应该直接调用 OpenAI、Claude、Qwen 或 LiteLLM API。

---

# 2. Module Boundary

整体调用关系：

```text
Agent / Application
        │
        ▼
    LLMService
        │
        ▼
     LLMClient
        │
        ▼
   LiteLLM Client
        │
        ▼
   LiteLLM Proxy
        │
        ▼
Model Provider
```

例如：

```text
Agent
↓
llm.generate(...)
↓
LLMService
↓
LiteLLM
↓
Qwen / OpenAI / Claude
```

---

# 3. Responsibilities

LLM 模块负责：

```text
统一请求格式

统一响应格式

模型配置

LiteLLM 接入

LLM Call Trace

Token Usage

Cost

Latency

Error Handling

Infrastructure Retry / Fallback
```

LLM 模块不负责：

```text
小说业务逻辑

Context 选择策略

Agent Planning

Generation 是否 Accept

Chapter 保存

Agent Workflow
```

---

# 4. Package Structure

推荐：

```text
packages/
└── llm/
    ├── types.ts
    ├── client.ts
    ├── service.ts
    ├── config.ts
    ├── call-repository.ts
    │
    └── providers/
        └── litellm.ts
```

后续可以扩展：

```text
providers/
├── litellm.ts
├── openai.ts
├── anthropic.ts
└── local-vllm.ts
```

Agent 不需要关心底层 provider。

---

# 5. LLMRequest

LLMRequest 是 Harness 内部统一的模型输入格式。

```ts
export interface LLMRequest {
  model: string

  messages: LLMMessage[]

  temperature?: number
  topP?: number
  maxTokens?: number

  tools?: unknown[]

  responseFormat?: unknown

  metadata?: Record<string, unknown>
}
```

Message：

```ts
export interface LLMMessage {
  role:
    | "system"
    | "user"
    | "assistant"
    | "tool"

  content: string

  name?: string
}
```

第一阶段尽量使用统一格式，不直接暴露 provider-specific request。

---

# 6. LLMResponse

统一返回：

```ts
export interface LLMResponse {
  content?: string

  toolCalls?: unknown[]

  finishReason?: string

  usage?: LLMUsage

  providerRequestId?: string
}
```

Usage：

```ts
export interface LLMUsage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number

  costMicros?: number
  costCurrency?: string
}
```

---

# 7. LLMClient

LLMClient 是底层模型调用接口。

```ts
export interface LLMClient {
  generate(
    request: LLMRequest
  ): Promise<LLMResponse>
}
```

第一版实现：

```text
LiteLLMClient
```

以后可以增加：

```text
OpenAIClient
AnthropicClient
LocalVLLMClient
```

Harness 不需要修改。

---

# 8. LiteLLM Integration

第一阶段继续使用 LiteLLM 作为统一模型 Gateway。

推荐关系：

```text
LLMService
    ↓
LiteLLMClient
    ↓
LiteLLM Proxy
    ↓
Provider
```

LiteLLM 主要负责：

```text
统一 Provider API

模型路由

Provider Retry

Fallback

Rate Limit

基础 Cost Tracking
```

本项目仍然需要自己的 LLMCall 数据模型。

原因：

LiteLLM 不知道：

```text
这个调用属于哪个 AgentRun

为什么调用模型

它属于 planner / writer / reviewer 哪一步

产生了哪个 Generation

用户最后是否 Accept
```

这些属于 Harness 自身语义。

---

# 9. LLMService

Agent 不直接调用 LLMClient。

统一通过：

```text
LLMService
```

LLMService 负责完整调用生命周期：

```text
create LLMCall
      ↓
call LLMClient
      ↓
collect usage
      ↓
collect latency
      ↓
save response
      ↓
update LLMCall
      ↓
return response
```

接口示例：

```ts
export interface LLMCallContext {
  runId?: string

  purpose: string

  projectId?: string
  chapterId?: string
}

export interface LLMService {
  generate(
    request: LLMRequest,
    context: LLMCallContext
  ): Promise<LLMResponse>
}
```

---

# 10. Purpose

每一次模型调用必须有：

```text
purpose
```

用于说明为什么调用模型。

例如：

```text
story_planning

chapter_writing

chapter_review

chapter_rewrite

chapter_summary

story_summary

character_extraction
```

例如：

```text
run_001

├── call_001
│   purpose = story_planning
│
├── call_002
│   purpose = chapter_writing
│
└── call_003
    purpose = chapter_review
```

这对于 Harness Trace 非常重要。

---

# 11. LLMCall

LLMCall 表示一次逻辑上的模型调用。

```ts
export interface LLMCall {
  id: string

  runId?: string

  projectId?: string
  chapterId?: string

  purpose: string

  provider?: string
  model: string

  request: LLMRequest

  response?: LLMResponse

  status:
    | "pending"
    | "running"
    | "completed"
    | "failed"

  usage?: LLMUsage

  latencyMs?: number

  providerRequestId?: string

  error?: string

  createdAt: string
  startedAt?: string
  finishedAt?: string
}
```

允许的状态转换：`pending → running → completed | failed`。`completed` 和 `failed` 是终止状态；只有 `failed` 可以保存 error。

---

# 12. LLMCall Relationship

LLMCall 不应该强绑定 Agent。

因为未来以下场景也可能调用模型：

```text
Prompt Playground

Batch Job

Evaluation

Manual Test

Summary Job
```

因此：

```text
runId
```

允许为空。

关系：

```text
AgentRun
   │
   │ optional
   ▼
LLMCall
```

---

# 13. LLMCall vs Generation

必须区分：

```text
LLMCall
= 所有模型调用

Generation
= 有业务意义、可以交给用户处理的生成结果
```

例如：

```text
AgentRun

├── LLMCall
│   purpose = planner
│
├── LLMCall
│   purpose = writer
│       │
│       ▼
│   Generation
│
└── LLMCall
    purpose = reviewer
```

不是每个 LLMCall 都需要生成 Generation。

Generation 必须保存：

```ts
llmCallId: string
```

表示由哪一次调用产生。

Generation 不重复保存 model、instruction、prompt 或完整 response；这些字段以 LLMCall 为 Source of Truth。

---

# 14. SQLite Storage

第一阶段新增：

```text
llm_calls
```

表。

以下 DDL 为便于阅读而重复展示；权威 schema 位于 Data Structure Design，修改时必须同步：

```sql
CREATE TABLE llm_calls (
    id TEXT PRIMARY KEY,

    run_id TEXT,
    project_id TEXT,
    chapter_id TEXT,

    purpose TEXT NOT NULL,

    provider TEXT,
    model TEXT NOT NULL,

    request_json TEXT NOT NULL CHECK (json_valid(request_json)),
    response_json TEXT CHECK (response_json IS NULL OR json_valid(response_json)),

    status TEXT NOT NULL
        CHECK (status IN ('pending', 'running', 'completed', 'failed')),

    input_tokens INTEGER CHECK (input_tokens IS NULL OR input_tokens >= 0),
    output_tokens INTEGER CHECK (output_tokens IS NULL OR output_tokens >= 0),
    total_tokens INTEGER CHECK (total_tokens IS NULL OR total_tokens >= 0),

    cost_micros INTEGER CHECK (cost_micros IS NULL OR cost_micros >= 0),
    cost_currency TEXT,

    latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),

    provider_request_id TEXT,

    error TEXT,

    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,

    CHECK (chapter_id IS NULL OR project_id IS NOT NULL),

    CHECK (
        (status = 'pending' AND started_at IS NULL AND finished_at IS NULL)
        OR
        (status = 'running' AND started_at IS NOT NULL AND finished_at IS NULL)
        OR
        (status IN ('completed', 'failed') AND started_at IS NOT NULL AND finished_at IS NOT NULL)
    ),

    CHECK (
        (status = 'failed' AND error IS NOT NULL)
        OR
        (status <> 'failed' AND error IS NULL)
    ),

    FOREIGN KEY (run_id)
        REFERENCES agent_runs(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (chapter_id)
        REFERENCES chapters(id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_llm_calls_run_created
ON llm_calls(run_id, created_at);
```

每个 SQLite 连接必须启用 `PRAGMA foreign_keys = ON`。关联 AgentRun 时，project/chapter 必须与该 Run 一致；LLMService 作为唯一写入入口负责校验这个跨字段不变量。

---

# 15. Request / Response Storage

MVP 阶段：

```text
request_json
response_json
```

直接保存到 SQLite。

原因：

这些数据对于以下任务很重要：

```text
debug

replay

prompt optimization

model comparison

evaluation

cost analysis
```

因此不要把完整 LLM 输入输出只放在：

```text
logs/
```

或者：

```text
.cache/
```

---

# 16. Large Payload Strategy

第一阶段不要提前优化。

如果未来 LLM 请求量非常大，可以把大文本拆到：

```text
data/
└── llm-artifacts/
    └── run-001/
        ├── call-001.request.json
        └── call-001.response.json
```

SQLite 只保存：

```text
metadata
request_path
response_path
usage
latency
status
```

但 MVP 先直接存 SQLite。

---

# 17. Logging

LLMCall 是持久化 Trace。

普通日志只记录运行信息。

例如：

```text
INFO  LLM request started
INFO  LLM request completed
WARN  LLM latency high
ERROR LLM request failed
```

日志建议包含：

```text
llmCallId
runId
model
purpose
latency
```

不要默认在普通日志中记录完整：

```text
Prompt

小说正文

LLM Output
```

---

# 18. Agent Event

LLM 模块和 Agent Event 可以关联。

例如：

```text
llm.requested

llm.completed
```

Agent Event 只记录关键业务语义。

例如：

```json
{
  "type": "llm.completed",
  "data": {
    "llmCallId": "call_001"
  }
}
```

完整 Request / Response 通过：

```text
LLMCall
```

查询。

避免重复存储大量 Prompt。

---

# 19. Retry

需要区分两类 Retry。

## Infrastructure Retry

例如：

```text
timeout

429

provider unavailable
```

这种 retry 可以由 LiteLLM 处理。

逻辑上仍然属于：

```text
同一个 LLMCall
```

---

## Agent Retry

例如：

```text
模型写得不好

Reviewer 判定不通过

用户点击 Retry
```

这种情况应该创建：

```text
新的 LLMCall
```

因为 Agent 做出了新的执行决策。

如果是用户在 Generation Preview 点击 Retry，还必须创建新的 AgentRun，并通过新 Generation 的 `parentGenerationId` 指向旧 Generation。旧 AgentRun 保持 completed。Run 内部的 Reviewer 重试只创建新的 LLMCall，不必创建新 Run。

---

# 20. Streaming

第一阶段可以支持 streaming，但不要让 Agent 直接处理 provider stream。

推荐：

```text
Provider Stream
      ↓
LLMClient
      ↓
Normalized Stream
      ↓
LLMService
      ↓
Application / UI
```

后续可以增加：

```ts
interface LLMStreamChunk {
  content?: string
  toolCallDelta?: unknown
}
```

MVP 如果实现复杂，可以先只支持非流式调用。

---

# 21. Model Configuration

模型配置独立管理。

例如：

```ts
export interface ModelConfig {
  id: string

  model: string

  provider?: string

  temperature?: number
  topP?: number
  maxTokens?: number
}
```

不要在 Agent 代码中大量硬编码：

```text
model name

temperature

baseURL

API key
```

这些应该进入 LLM config。

---

# 22. Secrets

以下内容不能写入数据库或日志：

```text
API Key

Authorization Header

Access Token

Password
```

通过：

```text
Environment Variables
```

或者专门的 secrets 管理方式提供。

---

# 23. Recommended Data Flow

一次 Writer 调用：

```text
AgentRun
   ↓
build Context
   ↓
create LLMRequest
   ↓
LLMService.generate()
   ↓
create LLMCall
   ↓
LiteLLMClient
   ↓
LiteLLM Proxy
   ↓
Model
   ↓
LLMResponse
   ↓
update LLMCall
   ↓
create Generation
   ↓
Generation Preview
```

---

# 24. Example

例如：

```text
AgentRun
run_001

purpose:
continue chapter 18
```

第一次：

```text
LLMCall
call_001

purpose = story_planning
model = qwen
```

第二次：

```text
LLMCall
call_002

purpose = chapter_writing
model = qwen
```

产生：

```text
Generation
gen_001

llmCallId = call_002
```

第三次：

```text
LLMCall
call_003

purpose = chapter_review
model = qwen
```

关系：

```text
Session
└── AgentRun
    ├── AgentEvents
    ├── LLMCall #1 Planner
    ├── LLMCall #2 Writer
    │       └── Generation
    └── LLMCall #3 Reviewer
```

---

# 25. MVP Scope

第一阶段只实现：

```text
LLMRequest

LLMResponse

LLMUsage

LLMCall

LLMClient

LiteLLMClient

LLMService

llm_calls table
```

记录：

```text
request

response

model

purpose

tokens

cost

latency

status

error
```

暂时不要实现复杂：

```text
multi-provider scheduler

dynamic routing

model evaluation

prompt registry

semantic cache

advanced fallback policy

distributed tracing
```

---

# 26. Core Rule

LLM 模块负责：

```text
How to call the model
```

Agent 模块负责：

```text
Why and when to call the model
```

Domain 模块负责：

```text
What business data is being processed
```

Storage 模块负责：

```text
Where the data is stored
```

Logging 模块负责：

```text
What happened at runtime
```

这几个边界不要混在一起。
