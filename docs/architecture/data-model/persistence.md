# Persistence Model

## 1. Purpose

Persistence Model 定义：

> 数据最终存在哪里。

业务模型和 Agent 模型不应该直接依赖具体存储方式。

---

## 2. Storage Types

项目第一阶段区分四类数据。

```text
File System
Derived Artifact
SQLite
.cache
```

---

## 3. File System

用于保存用户真正的创作内容。

```text
data/
└── projects/
    └── novel-001/
        ├── project.json
        ├── chapters/
        │   ├── 0001.md
        │   └── 0002.md
        ├── characters/
        └── story/
```

适合存：

```text
Chapter Content
Character
World
Outline
Style
```

这些数据属于 Source of Truth。

`project.json` 是可移植 Project 配置的 Source of Truth；SQLite `projects` 是可以重建的本机索引。

---

## 4. SQLite

用于结构化状态和 Harness 运行记录。

推荐表：

```text
projects

chapters

sessions

agent_runs

llm_calls

generations

agent_events
```

适合存：

```text
metadata
status
history
trace
relationship
```

---

## 5. Derived Artifacts

章节提取结果与 Wiki 知识文档属于持久化派生数据。

它们必须携带来源路径、来源哈希、schema version 和 canon level。来源变化时将其标记为 stale 并重建，但不能像普通 cache 一样静默删除。

---

## 6. .cache

用于保存可以重新生成的数据。

例如：

```text
.cache/
├── context/
├── summaries/
└── temp/
```

适合存：

```text
context cache
summary cache
embedding
temporary files
```

判断原则：

> 删除后可以重新生成的数据，才适合放 cache。

---

## 7. UI Local Storage

浏览器 localStorage 可以保存少量 UI 偏好：

```text
Project Sidebar 是否折叠
Chapter Sidebar 是否折叠
Agent Panel 是否折叠
Theme
最近打开的 Project
```

不要用 localStorage 存小说正文。

---

## 8. Principle

简单规则：

```text
用户创作内容
→ File System

需要查询和历史的数据
→ SQLite

带来源信息的持久化派生数据
→ Derived Artifact files

可以重新生成的数据
→ .cache

纯 UI 偏好
→ localStorage
```
