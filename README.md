# NovelWriter

面向小说创作的 Agent / Harness 工程，提供以章节编辑器为中心、Agent 对话为辅助的写作工作台。

## 当前状态

Web UI 目前处于交互原型阶段：四栏布局、编辑器、Agent 面板与折叠交互已实现，**无演示数据（首启为空）**。项目与章节元数据已接入 SQLite（首次启动自动建库并迁移；创建项目落盘 `project.json`，创建章节在 `chapters/` 下生成正文文件）。数据目录默认是仓库内的 `data/`，可在 Settings 中改到仓库之外，位置记在 `.novelwriter.json`（已被 gitignore），使数据与代码各自独立备份；支持项目重命名/归档/恢复与章节重命名/删除；正文 800ms 防抖自动保存到 .md 文件（含 revision 并发校验）。项目与章节以 URL 路由切换（`/projects/:projectId/chapters/:chapterId`），刷新可恢复。已知边界：硬刷新/关标签页可能丢失最后 800ms 内的输入；切换数据目录后页面会整页重载。Agent 尚未接入真实模型。

## 本地运行

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。

常用检查：

```bash
npm run lint
npm run build
```

## 目录结构

分层与依赖方向见 [代码结构设计](docs/architecture/structure.md)。

```text
app/                         Next.js 路由、布局和全局样式
src/
├── actions/                 服务端 Action：UI 的唯一入口
├── ui/workspace/            工作台客户端组件
├── agent/                   Agent 运行时内核（与小说无关）
├── llm/                     模型调用契约、服务与 LiteLLM 适配
├── novel/                   小说业务：类型、仓储与 TXT 导入
└── storage/                 SQLite 连接与迁移
docs/
├── product/                 产品与交互设计
├── architecture/            Harness、数据和 LLM 架构
├── reviews/                 评审记录
├── references.md            外部参考资料
└── README.md                文档索引与维护约定
```

业务数据不在仓库内，位置由 Settings 里的「数据目录」决定，记在 `.novelwriter.json`。

## 文档入口

- [文档索引](docs/README.md)
- [代码结构设计](docs/architecture/structure.md)
- [Web UI 产品设计](docs/product/web-ui.md)
- [Web UI 问题与修复建议](docs/reviews/web-ui-review.md)
- [Harness 数据结构总览](docs/architecture/data-model/overview.md)
- [LLM 模块设计](docs/architecture/llm.md)
