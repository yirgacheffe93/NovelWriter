"""章节提取结果校验模块。

职责：
    1. 校验 data/chapters/*.json 的 JSON 合法性；
    2. 检查 schema 顶层字段完整性；
    3. 抽查关键字段取值是否合法；
    4. 用 prettytable 输出统计汇总。
"""

import json
from pathlib import Path

from prettytable import PrettyTable

CHAPTERS_DIR = Path(__file__).resolve().parents[1] / "data" / "chapters"

# chapter_extract schema 的全部顶层字段（来自 prompt 第 22 节）
REQUIRED_TOP_KEYS = [
    "schema_version", "parse_status", "source", "chapter_metadata",
    "chapter_boundaries", "scenes", "events", "characters",
    "character_state_changes", "knowledge_states", "locations", "items",
    "factions", "world_rules", "hooks_and_clues", "timelines",
    "cliffhanger_analysis", "style_profile", "entity_resolution_issues",
    "continuity_issues", "interpretation_candidates", "chapter_end_state",
    "validation_issues", "quality_checks",
]

# 合法枚举值集合
VALID_PARSE_STATUS = {"success", "needs_split", "partial", "failed"}
VALID_EVENT_STATUS = {
    "occurred", "ongoing", "attempted", "planned", "ordered", "threatened",
    "prevented", "interrupted", "remembered", "reported", "hypothetical",
    "uncertain",
}
VALID_EPISTEMIC = {
    "narrator_confirmed", "directly_observed", "internal_confirmed",
    "character_claim", "reported_event", "rumor", "speculation",
    "disputed", "ambiguous", "unknown",
}
VALID_REALITY = {
    "present_reality", "memory", "flashback", "dream", "hallucination",
    "vision", "simulation", "story_within_story", "hypothetical",
    "metaphorical", "unknown",
}


def validate_one(path: Path) -> dict:
    """校验单个章节 JSON，返回统计与问题清单。

    Args:
        path: 章节 JSON 文件路径。

    Returns:
        统计字典，含 errors（字段缺失/非法）与 stats（数量统计）。
    """
    result: dict = {"file": path.name, "errors": [], "stats": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        result["errors"].append(f"JSON解析失败: {e}")
        return result

    # 1. 顶层字段完整性
    missing = [k for k in REQUIRED_TOP_KEYS if k not in data]
    if missing:
        result["errors"].append(f"缺失顶层字段: {missing}")

    # 2. schema_version
    if data.get("schema_version") != "chapter-canon-extraction-v1.0":
        result["errors"].append(
            f"schema_version 非法: {data.get('schema_version')}"
        )

    # 3. parse_status
    ps = data.get("parse_status")
    if ps not in VALID_PARSE_STATUS:
        result["errors"].append(f"parse_status 非法: {ps}")

    # 4. 枚举值抽查（events）
    bad_event_status = []
    bad_event_epistemic = []
    bad_event_reality = []
    for ev in data.get("events", []):
        if ev.get("event_status") not in VALID_EVENT_STATUS:
            bad_event_status.append(ev.get("event_status"))
        if ev.get("epistemic_status") not in VALID_EPISTEMIC:
            bad_event_epistemic.append(ev.get("epistemic_status"))
        if ev.get("reality_layer") not in VALID_REALITY:
            bad_event_reality.append(ev.get("reality_layer"))
    if bad_event_status:
        result["errors"].append(f"非法 event_status: {set(bad_event_status)}")
    if bad_event_epistemic:
        result["errors"].append(
            f"非法 event epistemic_status: {set(bad_event_epistemic)}"
        )
    if bad_event_reality:
        result["errors"].append(
            f"非法 event reality_layer: {set(bad_event_reality)}"
        )

    # 5. quality_checks 是否全 true（自检通过标志）
    qc = data.get("quality_checks", {})
    qc_false = [k for k, v in qc.items() if v is False]
    if qc_false:
        result["stats"]["quality_checks_false"] = qc_false

    # 6. 数量统计
    s = result["stats"]
    s["scenes"] = len(data.get("scenes", []))
    s["events"] = len(data.get("events", []))
    s["characters"] = len(data.get("characters", []))
    s["state_changes"] = len(data.get("character_state_changes", []))
    s["knowledge"] = len(data.get("knowledge_states", []))
    s["locations"] = len(data.get("locations", []))
    s["items"] = len(data.get("items", []))
    s["factions"] = len(data.get("factions", []))
    s["world_rules"] = len(data.get("world_rules", []))
    s["hooks"] = len(data.get("hooks_and_clues", []))
    s["timelines"] = len(data.get("timelines", []))
    s["continuity_issues"] = len(data.get("continuity_issues", []))
    s["entity_issues"] = len(data.get("entity_resolution_issues", []))

    cm = data.get("chapter_metadata", {})
    s["title"] = cm.get("chapter_id", "unknown")
    return result


def main() -> None:
    """校验全部章节并打印汇总表。"""
    files = sorted(CHAPTERS_DIR.glob("chapter-*.json"))
    if not files:
        print(f"未找到章节文件: {CHAPTERS_DIR}")
        return

    results = []
    for f in files:
        results.append(validate_one(f))

    # 错误汇总
    all_errors = [r for r in results if r["errors"]]
    print(f"=== 校验 {len(results)} 个章节文件 ===\n")
    if all_errors:
        print(f"⚠️  {len(all_errors)} 个文件存在问题:\n")
        for r in all_errors:
            print(f"  [{r['file']}]")
            for e in r["errors"]:
                print(f"    - {e}")
            print()
    else:
        print("✅ 全部 26 个文件 JSON 合法、schema 顶层字段完整、枚举值合法。\n")

    # 统计表
    table = PrettyTable()
    table.field_names = [
        "文件", "章节", "场景", "事件", "人物", "状态变化",
        "知识", "地点", "物品", "势力", "世界规则", "伏笔",
        "时间线", "连续性问题", "实体问题",
    ]
    table.align = "r"
    table.align["文件"] = "l"
    table.align["章节"] = "l"

    totals = {k: 0 for k in table.field_names[2:]}
    for r in results:
        s = r["stats"]
        row = [
            r["file"],
            s.get("title", "?"),
            s.get("scenes", 0),
            s.get("events", 0),
            s.get("characters", 0),
            s.get("state_changes", 0),
            s.get("knowledge", 0),
            s.get("locations", 0),
            s.get("items", 0),
            s.get("factions", 0),
            s.get("world_rules", 0),
            s.get("hooks", 0),
            s.get("timelines", 0),
            s.get("continuity_issues", 0),
            s.get("entity_issues", 0),
        ]
        table.add_row(row)
        for i, key in enumerate(table.field_names[2:]):
            totals[key] += row[i + 2]

    # 合计行
    table.add_row([""] * 2 + ["—"] * (len(table.field_names) - 2))
    table.add_row(
        ["合计", ""] + [totals[k] for k in table.field_names[2:]]
    )
    print(table)

    # quality_checks 未全通过的文件
    qc_issues = [
        (r["file"], r["stats"].get("quality_checks_false", []))
        for r in results
        if r["stats"].get("quality_checks_false")
    ]
    if qc_issues:
        print(f"\n⚠️  {len(qc_issues)} 个文件 quality_checks 存在 false 项:")
        for fname, false_keys in qc_issues:
            print(f"  {fname}: {false_keys}")


if __name__ == "__main__":
    main()
