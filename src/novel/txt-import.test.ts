/**
 * txt-import 回归测试（node:test，无第三方依赖，node --test 运行）。
 * 锁定两条产品预期（docs/product/web-ui.md §26.1 Import TXT）：
 * - 首个被接受标题之前的内容（网站声明/广告/简介）丢弃；
 * - 标题之后的正文零丢失；整本无标题归为单章。
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { decodeTxt, splitChapters } from "./txt-import.ts";

/** 真实导入固件（广告+两段简介+前言，UTF-8 无 BOM），与本测试同目录。 */
const FIXTURE = path.resolve(
  fileURLToPath(new URL("./txt-import.fixture.txt", import.meta.url)),
);

test("真实固件：丢弃引言区，前言起正文完整保留", () => {
  const text = decodeTxt(fs.readFileSync(FIXTURE));
  const chapters = splitChapters(text, "测试数据");

  assert.equal(chapters.length, 1);
  assert.equal(chapters[0].title, "前言");
  // 前言之后的正文零丢失：与原文尾部逐行一致
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const headingIndex = lines.findIndex((line) => line.trim() === "前言");
  assert.ok(headingIndex >= 0);
  assert.equal(chapters[0].content, lines.slice(headingIndex + 1).join("\n").trim());
});

test("整本无标题：单章回退，内容零丢失", () => {
  const text = "这是一段没有标题的小说正文。\n\n第二段。\n\n第三段。";
  const chapters = splitChapters(text, "书名");

  assert.equal(chapters.length, 1);
  assert.equal(chapters[0].title, "书名");
  assert.equal(chapters[0].content, text);
});

test("首个标题是假标题：其区域随引言区一并丢弃（文档化边界）", () => {
  const longBody = "后续正文。" + "很长的正文。".repeat(10); // >50 字符
  const chapters = splitChapters(`第一章\n两句落款。\n第二章\n${longBody}`, "书名");

  // 「第一章」后正文不足 MIN_BODY，是假标题；「第二章」成为首个被接受标题
  assert.equal(chapters.length, 1);
  assert.equal(chapters[0].title, "第二章");
  assert.equal(chapters[0].content, longBody);
});

test("正文中段的假标题并入上一章，无内容丢失", () => {
  const longBody = "很长的正文。".repeat(10);
  const text = `第一章 相遇\n${longBody}\n第二章\n很短的假体。\n第三章 告别\n${longBody}`;
  const chapters = splitChapters(text, "书名");

  assert.deepEqual(
    chapters.map((chapter) => chapter.title),
    ["第一章 相遇", "第三章 告别"],
  );
  // 假标题行与「假体」并入上一章正文
  assert.ok(chapters[0].content.includes("第二章"));
  assert.ok(chapters[0].content.includes("很短的假体。"));
  // 被接受的标题行成为章节标题（元数据），其余正文零丢失
  const kept = chapters.map((chapter) => chapter.content).join("\n");
  assert.equal(kept, `${longBody}\n第二章\n很短的假体。\n${longBody}`);
});
