# 📚 小说原著与续写文本“编译”为 Wiki 知识库工作流指南 (Novel-Wiki SOP)

利用 LLM 将已有的原始小说文本（`data/raw`）与新撰写的续写文本（`data/new_generated`）“编译”为结构化、交叉链接、自洽无冲突的小说 Wiki 知识库（Novel Bible），确保续写与原著在**设定、人物、伏笔、文风**上高度统一。

---

## 增量编译检查清单

- [ ] **扫描检查**：运行扫描，检查 `data/raw`（原著手稿）以及 `data/new_generated`（续写草稿）目录中是否有新增或修改的章节文件
- [ ] **哈希对比**：与 `data/wiki_tmp/compile-results.tsv` 中的记录对比，确认变更
- [ ] **日志记录**：将检查过程与变更细节写入 `data/wiki_tmp/compile.log`
- [ ] **只编译变更**：仅处理新增或修改的章节文件
- [ ] **更新 frontmatter**：确保新编译的 Wiki 文档包含 `raw_sources` 及 `canon_level`（设定权威度）
- [ ] **更新状态文件**：追加/更新 `data/wiki_tmp/compile-results.tsv` 中的哈希记录
- [ ] **更新来源索引**：更新 `data/wiki_tmp/sources.md`，添加本次新增的章节与来源

---

## 阶段 0：增量检查 (Incremental Inspection)

**任务**：精准识别 `data/raw` 与 `data/new_generated` 目录下需要被增量提取或重新编译的小说文本。

**步骤**：
1. 读取 `data/wiki_tmp/compile-results.tsv`，获取已处理文本的哈希记录。
2. 遍历 `data/raw`（原著）以及 `data/new_generated`（续写），计算每个 Markdown/Text 文件的 SHA-256 哈希。
3. 对比哈希值，识别：
   - **新增章节**：在 `compile-results.tsv` 中无记录的文件。
   - **修改/重写章节**：哈希值改变的文件（如对断更卡点或原著细节进行了修订）。
   - **未修改文件**：哈希值相同的文件（直接跳过）。
4. 将扫描时间、变更文件清单及冲突记录写入 `data/wiki_tmp/compile.log`。

---

## 阶段 1：小说文本多维解构 (Novel Text Deconstruction)

**任务**：从新增或修改的小说章节中，全方位解构并提取用于构建 Wiki 的“核心要素”。

### 长篇小说完整解构要求

对小说章节进行拆解时，必须完整覆盖以下维度：

1. **结构与场景定位**：
   - **章节与切景扫描**：使用 Grep 搜索章节标题（如 `第X章/卷三`）或场景分割符（如 `【】`、`***`、`###`），梳理叙事节奏。
   - **断更卡点（Cliffhanger）精准剖析**：若为最新章节，重点剖析**最后 3 个场景**，明确即时冲突、危机紧迫度与未完成动作。
   - **时空与视角锚定**：明确叙事视角（第一人称/第三人称限知/上帝视角）、事件发生的时间节点（历法/季节/时刻）与物理场景。

2. **核心要素抽取**：
   - **人物档案（Character Matrix）**：
      - 抽取登场角色的外貌特征、口癖/习惯、能力等级、天赋、武器、角色摘要、主要矛盾冲突、人物关系、关键事件(标注章节)
      - **核心欲望（Desire）**
      - **心理创伤（Wound）**
      - 及断更时的**即时心理状态**
   - **世界观与规则（Worldbuilding & Hard Rules）**：提取新出现的战力/技术等级、力量代价、法则限制、社会势力分布与地理环境。
   - **伏笔与悬念（Foreshadowing & Hooks）**：
     - **显性悬念**：直接抛出的未解谜团（如：密信内容、门后之人）。
     - **隐性伏笔**：言语暗示、未登场人物、尚未兑现的道具（契诃夫之枪）。
   - **文风特征（Style Profile）**：记录本段文本的句式长短偏好、修辞习惯、感官描写比例（视/听/嗅/心理）与情绪基调（暗黑/热血/悬疑）。
   - **故事时间线 (Story TimeLine)**:
      - 要有主时间线剧情，以及同时的副时间剧情
      - 每个时间线要有：时间、地点、任务、剧情

3. **例外情况处理**：
   - **纯过渡/打斗短章节**：可简化世界观提取，重点记录场景转换、战力损耗与人物伤亡状态。
   - **高设定依赖章节（硬科幻/规则怪谈/推理）**：必须优先提取“硬规则逻辑清单”，确保续写不产生逻辑漏洞。

### 元数据提取与 YAML Frontmatter 规范
1. 每次处理新的章节，都应该去维护更新在当前章节中出现的小说要素wiki
2. 为生成的每个 Wiki 条目（人物、地点、设定、线索）添加 YAML Frontmatter：

```yaml
---
title: 林肖
type: character # 可选: character | location | item | power-system | plot-arc | clue
tags: [角色/主角, 阵营/玄天宗, 战力/金丹期]
canon_level: official # official (原著正史) | generated (续写衍生)
raw_sources:
  - path: raw/chapter-001.md
    hash: "sha256:abc123..."
  - path: new_generated/chapter-045.md
    hash: "sha256:def456..."
confidence_score: 0.95 # 设定推导的可信度
last_updated: 2026-08-03
---