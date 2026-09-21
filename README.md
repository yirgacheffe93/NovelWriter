# NovelWriter

面向小说创作的 Agent / Harness 工程，提供以章节编辑器为中心、Agent 对话为辅助的写作工作台。

## 当前状态

Web UI 目前处于交互原型阶段：四栏布局、编辑器、Agent 面板与折叠交互已实现，**无演示数据（首启为空）**。项目与章节元数据已接入 SQLite（`data/novelwriter.db`，首次启动自动迁移；创建项目落盘 `data/projects/<id>/project.json`，创建章节在 `data/projects/<id>/chapters/` 下生成正文文件）；支持项目重命名/归档/恢复与章节重命名/删除；正文 800ms 防抖自动保存到 .md 文件（含 revision 并发校验）。项目与章节以 URL 路由切换（`/projects/:projectId/chapters/:chapterId`），刷新可恢复。已知边界：硬刷新/关标签页可能丢失最后 800ms 内的输入。Agent 尚未接入真实模型。

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

```text
app/                         Next.js 路由、布局和全局样式
features/
└── workspace/               小说工作台功能域
    ├── components/          工作台 UI 组件
    ├── server/              SQLite 连接、迁移与 Project/Chapter 持久化
    ├── actions.ts           服务端 Action（创建项目/章节）
    └── types.ts             当前工作台使用的类型
docs/
├── product/                 产品与交互设计
├── architecture/            Harness、数据和 LLM 架构
├── references.md            外部参考资料
└── README.md                文档索引与维护约定
public/
└── images/                  静态图片资源
```

## 文档入口

- [文档索引](docs/README.md)
- [Web UI 产品设计](docs/product/web-ui.md)
- [Web UI 问题与修复建议](docs/reviews/web-ui-review.md)
- [Harness 数据结构总览](docs/architecture/data-model/overview.md)
- [LLM 模块设计](docs/architecture/llm.md)
