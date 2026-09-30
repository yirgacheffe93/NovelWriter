# NovelWriter 大模型接入计划

## 目标与现状

- 目标：让 Agent 通过一个稳定的项目内接口调用模型，并保留每次调用与项目、章节、AgentRun 的关系。
- 现状：Next.js 16 服务端与 SQLite 已存在；Agent 面板尚未接入真实模型，仓库里没有 LLM 调用代码。
- 本计划落实 [LLM 模块设计](llm.md) 的边界；这里只设计接入方案，不代表已经实现。

## 假设与方案选择

首个版本按单实例、服务端调用、一个文本模型、非流式生成设计。模型密钥由应用部署者提供，浏览器不直接调用模型。小说正文可能进入模型请求，因此请求内容不写入普通日志。

| 方式 | 优点 | 代价 | 选择 |
| --- | --- | --- | --- |
| Next.js 直连单一供应商 | 服务最少 | 换供应商时应用需处理协议差异 | 暂不采用；已有多模型方向 |
| 应用内集成多套供应商 SDK | 不需要独立网关，能用供应商专有能力 | 适配、密钥、路由与升级由本项目维护 | 暂不采用 |
| LiteLLM Proxy + 薄 LLMClient | 供应商协议和模型映射集中配置，应用只接一个入口 | 要运行和维护一个额外服务 | 采用 |

借鉴 OpenCode 和 dsh 的共同边界：Agent 依赖项目内的模型调用契约，具体协议留在适配层。这里由 LiteLLM 承担供应商协议适配；NovelWriter 不复制它们的多供应商适配器体系。

## 职责与调用链

```text
Agent / Application
  → LLMService：校验调用上下文，创建并更新 LLMCall
  → LLMClient：项目内的 generate(request) 契约
  → LiteLLMClient：服务端 HTTP 适配、超时、响应与错误归一化
  → LiteLLM Proxy：模型别名、供应商协议转换、基础路由
  → Model Provider
```

- **Agent** 决定调用目的、上下文和结果是否成为 Generation；不接触 URL、密钥或供应商响应。
- **LLMService** 管理一次逻辑调用的生命周期，记录 `purpose`、`runId`、`projectId`、`chapterId`、请求、响应、状态、耗时和用量。业务性重试创建新的 LLMCall。
- **LLMClient** 只定义项目需要的输入输出；首版只有 `LiteLLMClient` 一个实现，不预建其他 provider 类。
- **LiteLLM Proxy** 负责供应商鉴权、模型别名与协议转换。将来需要时在网关配置基础设施重试、fallback、限流；避免应用和网关同时重试同一次请求。
- **SQLite** 保存 NovelWriter 的业务调用记录；LiteLLM 自身的密钥、预算与费用记录若启用数据库功能，应使用独立的 PostgreSQL，不能复用项目 SQLite。

## 首版接口

沿用 `llm.md` 的 `LLMRequest`、`LLMResponse`、`LLMUsage`、`LLMCallContext` 和 `LLMService.generate(request, context)`。首版实际支持 `system/user/assistant` 文本消息、`model`、`temperature`、`topP`、`maxTokens`；`model` 填 LiteLLM 对外暴露的**别名**，不填供应商内部模型名。

首版不发送尚未实现的 `tools`、`responseFormat` 或供应商专有参数；这些字段要在端到端验证后逐项开放。尤其是工具调用、结构化输出和推理参数，即使网关统一了 HTTP 形状，也可能存在模型能力差异，不能静默忽略不支持的字段。

`LiteLLMClient.generate()` 的最小行为：

1. 只在 Node.js 服务端读取 `LITELLM_BASE_URL`、`LITELLM_API_KEY`；通过原生 `fetch` 请求 Proxy 的 `/v1/chat/completions`。不在 Next.js 公共环境变量或浏览器代码中暴露密钥，也不需要在 Next.js 中安装 Python LiteLLM SDK。
2. 将项目请求映射成 OpenAI Chat Completions 格式，设置有限超时并转发取消信号；首版不在客户端自动重试。
3. 将返回的文本、`finish_reason`、token usage、可取得的请求 ID 转为 `LLMResponse`。非流式响应若有有效的 `x-litellm-response-cost`，按 USD 换算为 `costMicros`；取不到就保持为空，不把未知费用记为零。
4. 将连接失败、超时、HTTP 错误和无效响应转成稳定的项目错误类别。错误信息不包含密钥、请求正文或完整供应商响应。

这里的 `LiteLLMClient` 是 **TypeScript HTTP 适配器**，不是第二个网关进程，也不是让 Agent 直接依赖 LiteLLM 的类型。

## LiteLLM 配置与部署

首版使用单实例、配置文件管理模型的 LiteLLM Proxy。示意配置如下，真实模型名和密钥在部署时填写：

```yaml
model_list:
  - model_name: novel-writer
    litellm_params:
      model: openai/<实际模型 ID>
      api_key: os.environ/OPENAI_API_KEY
```

- 网关进程持有供应商密钥；Next.js 仅持有访问网关的密钥。应用环境变量为 `LITELLM_BASE_URL`、`LITELLM_API_KEY`、`LLM_MODEL=novel-writer`。
- 本地 Proxy 只监听本机或可信网络。镜像固定到已验证版本，不使用浮动 `latest` 标签。
- 配置文件模式可先不引入 PostgreSQL；此时仅使用网关 master key，**没有虚拟密钥、按应用分账或可靠的网关预算限制**。费用上限先在供应商侧设置。
- 如果将来需要多人密钥、预算和费用追踪，再为 LiteLLM 单独部署 PostgreSQL，应用改用受限虚拟密钥；多实例共享路由或限流状态时再评估 Redis。
- 首版只映射一个模型，不预设跨模型 fallback。小说写作中换模型可能改变风格与结果；后续启用 fallback 时需明确记录实际路由和行为。

## 持久化与现有设计的衔接

- `LLMService` 是唯一写入 `llm_calls` 的入口；按 `pending → running → completed | failed` 更新，一次基础设施重试仍对应同一个逻辑 LLMCall。
- `request_json` 和 `response_json` 按现有架构文档保存到项目 SQLite，供调试和回放；它们含小说内容，应限制读取权限，不进入普通日志。API key 与 Authorization header 永不入库。
- `llm_calls` 的权威 schema 与 AgentRun 外键见 `data-model/overview.md`。当前仓库尚无 `agent_runs` 表；实施该迁移前需先确认 AgentRun 迁移顺序，不能直接把文档 DDL 复制到现有数据库。
- LiteLLM 的费用数据是基础设施视角；NovelWriter 的 `LLMCall` 是业务视角，二者不能互相替代。

## 实施顺序与验收

1. **网关最小接入**：增加固定版本的 LiteLLM 启动配置和环境变量示例；配置一个别名。检查：用测试密钥通过 Proxy 完成一次请求，错误密钥返回明确鉴权失败。
2. **服务端适配**：实现 `LLMClient`、`LiteLLMClient` 和配置读取；以模拟 HTTP 响应验证请求映射、成功响应、超时及错误归一化。检查：没有浏览器可读取的密钥或供应商凭据。
3. **调用记录**：在确认 AgentRun 数据迁移依赖后实现 `LLMService`、`llm_calls` 迁移和仓储。检查：成功与失败调用各只产生一条状态正确的记录，关联信息、用量与耗时可查询。
4. **接入首个写作入口**：让一个明确的 Agent 操作经 `LLMService` 调用模型，生成结果先返回给用户审阅；正文写入由现有业务流程决定。检查：从 UI 发起到结果显示的完整链路可用，刷新后调用记录仍在。
5. **按需要扩展**：用户确实需要逐字展示时增加流式输出；验证具体模型后再开放工具调用、结构化输出、多模型路由和 fallback。每项能力都以端到端测试为准。

## 参考

- [LiteLLM Proxy 快速开始](https://docs.litellm.ai/docs/proxy/docker_quick_start)
- [LiteLLM 生产部署说明](https://docs.litellm.ai/docs/proxy/deploy)
- [OpenCode Provider 文档](https://opencode.ai/docs/providers)
- [dsh LLM 适配器指南](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/practice/llm-adapter.md)
