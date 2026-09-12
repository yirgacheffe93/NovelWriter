# Logging and Observability Design

## 1. Purpose

日志系统用于记录应用和 Harness 在运行过程中发生的系统行为，主要用于：

- 开发调试
- 错误排查
- 性能分析
- Agent Run 定位
- LLM 调用问题追踪

日志系统不负责保存小说业务数据，也不替代 Agent Event。

---

## 2. Log vs Agent Event

必须区分：

```text
Agent Event
= Agent 在语义上做了什么

Log
= 程序在运行过程中发生了什么
```

例如一次续写：

```text
Agent Event:

run.started
context.selected
llm.requested
llm.completed
generation.created
run.completed
```

对应系统日志可能是：

```text
INFO  Agent run started
DEBUG Loaded 3 chapters
DEBUG Context token count = 12432
INFO  Sending request to model
WARN  LLM latency is high
INFO  Generation saved
```

判断原则：

```text
以后需要用于展示、恢复、分析 Agent 执行过程
→ Agent Event

只用于开发、调试、排错
→ Log
```

---

## 3. Log Levels

第一阶段使用四个等级：

```text
debug
info
warn
error
```

### debug

用于开发调试。

例如：

```text
Loaded chapter chapter_018
Context contains 3 chapters
Prompt length = 12432 tokens
```

生产环境可以关闭。

---

### info

记录正常的重要系统行为。

例如：

```text
Application started
Agent run started
Context built
LLM request completed
Chapter saved
```

---

### warn

表示系统仍然可以继续运行，但出现异常情况。

例如：

```text
LLM latency is high
Context exceeds expected size
Auto save retrying
Cache read failed
```

---

### error

表示操作失败。

例如：

```text
Failed to load chapter
Failed to save generation
LLM request failed
Database write failed
```

---

## 4. Structured Log Format

日志应优先采用结构化格式。

推荐字段：

```ts
interface LogEntry {
  timestamp: string

  level:
    | "debug"
    | "info"
    | "warn"
    | "error"

  module: string

  message: string

  sessionId?: string
  runId?: string
  llmCallId?: string
  projectId?: string
  chapterId?: string

  data?: Record<string, unknown>

  error?: {
    name?: string
    message: string
    stack?: string
  }
}
```

---

## 5. Example

```json
{
  "timestamp": "2026-09-12T06:20:31.512Z",
  "level": "info",
  "module": "context-builder",
  "message": "Context built",
  "runId": "run_001",
  "projectId": "novel_001",
  "chapterId": "chapter_018",
  "data": {
    "chapterCount": 3,
    "tokenCount": 12432
  }
}
```

---

## 6. Module Naming

每条日志必须标明来源模块。

第一阶段推荐：

```text
app
api
project
chapter
editor
agent
context-builder
llm
generation
storage
cache
database
```

例如：

```text
module=context-builder

module=llm

module=storage
```

这样可以快速筛选日志。

---

## 7. Agent Run Correlation

Harness 相关日志必须尽可能携带：

```text
sessionId
runId
```

例如：

```text
runId=run_001
```

这样一次 Agent Run 的所有日志都可以关联起来。

推荐：

```text
User clicks Continue
        ↓
create run_001
        ↓
后续所有 Harness 日志
        ↓
携带 runId=run_001
```

例如：

```text
INFO  run_001 Agent run started

DEBUG run_001 Context selected

INFO  run_001 LLM request started

INFO  run_001 LLM request completed

INFO  run_001 Generation created
```

---

## 8. Storage Location

第一阶段日志直接保存到本地：

```text
logs/
├── app.log
└── error.log
```

其中：

```text
app.log
```

保存：

```text
debug
info
warn
error
```

```text
error.log
```

只保存：

```text
error
```

开发环境同时输出到 terminal。

---

## 9. Project Layout

推荐：

```text
novel-agent/

├── data/
│   ├── novel.db
│   └── projects/
│
├── .cache/
│   ├── context/
│   └── summaries/
│
├── logs/
│   ├── app.log
│   └── error.log
│
└── packages/
```

注意：

```text
logs/
```

不要放进：

```text
.cache/
```

因为日志无法重新生成。

---

## 10. Log Persistence

日志需要保存一段时间，但不属于永久业务数据。

第一阶段可以简单采用：

```text
按文件大小或日期轮转
```

例如：

```text
logs/
├── app.log
├── app.1.log
├── app.2.log
└── error.log
```

或者：

```text
logs/
├── 2026-09-12.log
├── 2026-09-13.log
└── 2026-09-14.log
```

MVP 不需要复杂日志生命周期管理。

---

## 11. LLM Logging

LLM 调用建议记录：

```text
model
runId
request duration
input token count
output token count
status
error
```

例如：

```json
{
  "level": "info",
  "module": "llm",
  "message": "LLM request completed",
  "runId": "run_001",
  "data": {
    "model": "gpt-5.6",
    "latencyMs": 4210,
    "inputTokens": 12432,
    "outputTokens": 2180
  }
}
```

---

## 12. Prompt and Content Logging

不要默认把完整小说正文、完整 Prompt 或完整模型输出写进普通日志。

原因：

- 日志文件会快速膨胀
- 难以阅读
- 可能包含敏感内容
- 会产生大量重复数据

普通日志只记录 metadata：

```text
prompt length
token count
chapter ids
model
latency
generation id
```

如果需要保存完整 Prompt 或 Output：

```text
Generation
Agent Event
Debug Artifact
```

使用专门的数据结构保存。

---

## 13. Error Logging

所有 error 日志至少包含：

```text
message
module
timestamp
```

Harness 相关错误尽量增加：

```text
runId
sessionId
projectId
chapterId
```

并保存原始 error：

```ts
logger.error({
  module: "llm",
  message: "LLM request failed",
  runId,
  error
})
```

不要只写：

```text
Something went wrong
```

错误日志必须能够定位问题。

---

## 14. Sensitive Data

日志中禁止保存：

```text
API Key
Access Token
Password
Authorization Header
Cookie
完整用户凭证
```

例如：

错误：

```text
Authorization: Bearer sk-xxxx
```

正确：

```text
Authorization: [REDACTED]
```

---

## 15. Performance Logging

第一阶段建议至少记录以下耗时：

```text
Context Build Time

LLM Latency

Chapter Save Time

Agent Run Total Time
```

例如：

```text
Context built in 120ms

LLM completed in 4210ms

Agent run completed in 4630ms
```

这些数据未来可以帮助定位 Harness 性能瓶颈。

---

## 16. Recommended Logger Interface

业务代码不要直接大量使用：

```ts
console.log(...)
```

统一封装 Logger：

```ts
interface Logger {
  debug(message: string, data?: Record<string, unknown>): void

  info(message: string, data?: Record<string, unknown>): void

  warn(message: string, data?: Record<string, unknown>): void

  error(
    message: string,
    error?: unknown,
    data?: Record<string, unknown>
  ): void
}
```

---

## 17. Child Logger

Harness 建议支持带 Context 的 Logger。

例如：

```ts
const runLogger = logger.child({
  sessionId,
  runId,
  projectId,
  chapterId
})
```

之后：

```ts
runLogger.info("Agent run started")

runLogger.info("Context built", {
  tokenCount: 12432
})
```

无需每次重复传递 runId。

---

## 18. Recommended Package Structure

```text
packages/

├── logging/
│   ├── logger.ts
│   ├── console-logger.ts
│   └── file-logger.ts
│
├── agent/
├── storage/
└── domain/
```

Harness Core 只依赖：

```text
Logger interface
```

不要依赖具体日志库。

---

## 19. MVP Scope

第一阶段只实现：

```text
Logger interface

Console output

File output

debug / info / warn / error

runId correlation

error logging
```

暂时不要实现：

```text
ELK

Loki

Grafana

OpenTelemetry

Distributed Tracing

Remote Log Server

Metrics Platform
```

---

## 20. Core Logging Points

第一版 Harness 建议在这些位置记录日志：

```text
Application Start

Project Load

Chapter Load

Chapter Save

Agent Run Start

Context Build Start

Context Build Complete

LLM Request Start

LLM Request Complete

Generation Save

Agent Run Complete

Agent Run Failed
```

不需要给每一行代码加日志。

---

## 21. Relationship With Agent Event

最终关系：

```text
Agent Run
   │
   ├── Agent Events
   │      ↓
   │   Harness execution history
   │
   └── Logs
          ↓
       Debug / Error / Performance
```

例如：

```text
Agent Event:

llm.completed
```

表达：

> Agent 的 LLM 调用已经完成。

日志：

```text
INFO llm request completed
model=gpt-5.6
latency=4210ms
input_tokens=12432
```

表达：

> 这个调用在系统层面具体如何运行。

两者可以同时存在，但职责不同。

---

## 22. Core Rule

设计日志时始终判断：

```text
这是 Agent 运行历史的一部分吗？
→ Agent Event

这是程序调试和排错信息吗？
→ Log

这是用户真正的数据吗？
→ Business Data

这是可以重新计算的中间结果吗？
→ Cache
```

日志系统只负责：

```text
Debug
Error
Performance
Runtime Observability
```

不要让日志成为业务数据或 Agent 状态的 Source of Truth。
