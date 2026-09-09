"""章节切分模块：将临界·爵迹全集按章节标题切分为独立源文件。

职责：
    1. 将 UTF-16LE 源文件转为 UTF-8；
    2. 按章节标题（序章/第X章/尾声）切分，跳过前言；
    3. 输出编号源文件（chapter-NNN.md）及元数据 TSV。
"""

import hashlib
import re
from pathlib import Path

# 标题正则：序章、第X章、尾声（带章名）
TITLE_PATTERN = re.compile(r'^(序章\s+\S.*|第.{1,3}章\s+\S.*|尾声\s+\S.*)$')

SRC_PATH = Path(__file__).resolve().parents[1] / "data" / "raw" / "临界-爵迹.txt"
OUT_DIR = Path(__file__).resolve().parents[1] / "data" / "raw" / "chapters_src"
META_TSV = Path(__file__).resolve().parents[1] / "data" / "raw" / "chapters_meta.tsv"


def split_chapters() -> None:
    """读取 UTF-16LE 源文件，切分章节并写出编号源文件。"""
    raw = SRC_PATH.read_bytes()
    text = raw.decode("utf-16-le")
    # 规范化行尾
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")

    # 找标题行
    headers: list[tuple[int, str]] = []
    for i, line in enumerate(lines):
        s = line.strip()
        if TITLE_PATTERN.match(s) and len(s) < 40:
            headers.append((i, s))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rows: list[str] = ["index\tfile\ttitle\tchar_count\tsha256"]

    for idx, (lineno, title) in enumerate(headers):
        next_lineno = headers[idx + 1][0] if idx + 1 < len(headers) else len(lines)
        body = "\n".join(lines[lineno:next_lineno]).strip() + "\n"
        sha = hashlib.sha256(body.encode("utf-8")).hexdigest()
        fname = f"chapter-{idx:03d}.md"
        (OUT_DIR / fname).write_text(f"# {title}\n\n{body}", encoding="utf-8")
        rows.append(f"{idx:03d}\t{fname}\t{title}\t{len(body)}\t{sha}")

    META_TSV.write_text("\n".join(rows) + "\n", encoding="utf-8")
    print(f"切分完成：{len(headers)} 章 -> {OUT_DIR}")
    print(f"元数据：{META_TSV}")


if __name__ == "__main__":
    split_chapters()
