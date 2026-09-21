# 文档索引

项目文档按“产品定义”和“技术架构”分开维护。产品文档描述用户体验和范围，架构文档描述实现边界与持久化模型。

## 产品设计

- [Web UI](product/web-ui.md)：工作台布局、交互、状态和 MVP 范围。

## 技术架构

- [Harness 数据结构总览](architecture/data-model/overview.md)：完整数据结构与持久化设计，是数据模型的主文档。
- [业务领域模型](architecture/data-model/business-domain.md)：Project、Chapter 和故事资料等业务概念。
- [Agent Runtime 模型](architecture/data-model/agent-runtime.md)：Session、AgentRun、Generation 和 AgentEvent。
- [持久化模型](architecture/data-model/persistence.md)：文件、SQLite、缓存和浏览器状态的边界。
- [模型映射](architecture/data-model/model-mapping.md)：业务、运行时与存储模型之间的关系。
- [日志与可观测性](architecture/data-model/observability.md)：日志、事件、指标与敏感数据规则。
- [LLM 模块](architecture/llm.md)：模型调用接口、记录、错误和安全约束。

## 参考资料

- [References](references.md)

## 评审与改进

- [Web UI 问题与修复建议](reviews/web-ui-review.md)

## 维护约定

- 文件名统一使用小写 kebab-case，避免空格和序号承担分类职责。
- 数据结构发生冲突时，以 `architecture/data-model/overview.md` 为准，再同步更新对应专题文档。
- 产品范围或阶段变化时，同时更新根目录 `README.md` 的“当前状态”和相关产品文档。
- 代码路径变化时，必须搜索并更新文档中的路径引用。
