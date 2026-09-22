/**
 * txt 小说导入解析：编码检测 + 章节拆分，纯函数、无 IO。
 * 拆分规则（对真实 txt 实测校准，见导入功能计划）：
 * - 优先标准标题行（第X章/回/节 或 序章/前言/尾声 等）；
 * - 无标准标记时用裸标题启发式（独立短行、无句末标点、非引号开头）；
 * - 候选行到下一候选行之间的正文不足 MIN_BODY 字符时不是标题，不切分、
 *   该行并入上一章正文（零内容丢失，滤掉落款等假标题）；
 * - 首个标题前的引言区丢弃；无任何有效标题则整本单章。
 */
import type { ImportedNovelItem } from "../types";

/** 标准章节标题行：第X章/回/节/卷/部/篇（阿拉伯或中文数字），或常见序跋类标记。 */
const STANDARD_HEADING =
  /^(第[0-9〇零一二三四五六七八九十百千万两]+[章回节卷部篇]|序章|序言|前言|楔子|引子|尾声|终章|后记|番外)/;

/** 标准标题行须为短行：正文段落以「第二章的…」开头时（长度远大于标题）不误判。 */
const HEADING_MAX_LENGTH = 30;

/** 句末标点：裸标题不应以句子形式结尾（「为了上大学……」等结尾标题并入上一章，属已知边界）。 */
const SENTENCE_PUNCT = /[。！？；：，、…]/;

/** 裸标题不应以引号/括号/标点开头（滤掉对话行）。 */
const PUNCT_START = /^[“”"'「」『』（(【\[<《*\-·~…—]/;

/** 标题到下一标题之间的正文不足此字符数则视为假标题（落款、署名等短行）。 */
const MIN_BODY_LENGTH = 50;

/** 裸标题候选行字符数范围。 */
const TITLE_MIN_LENGTH = 2;
const TITLE_MAX_LENGTH = 20;

export interface SplitChapter {
  title: string;
  content: string;
}

/** 解码 txt 文件：BOM 优先（UTF-8 / UTF-16LE / UTF-16BE），无 BOM 先试 UTF-8 再回退 GB18030。 */
export function decodeTxt(buffer: Buffer): string {
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buffer);
  }
  if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(buffer);
  }
  const bytes =
    buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf
      ? buffer.subarray(3)
      : buffer;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("gb18030").decode(bytes);
  }
}

/** 按标题行拆分章节。fallbackTitle 用于整本无标题时的单章标题（如文件名）。 */
export function splitChapters(text: string, fallbackTitle: string): SplitChapter[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  const marks = findHeadingLines(lines);
  const chapters = cutAtMarks(lines, marks);

  if (chapters.length === 0) {
    const whole = lines.join("\n").trim();
    if (!whole) {
      throw new Error("txt 文件内容为空");
    }
    return [{ title: fallbackTitle, content: whole }];
  }
  return chapters;
}

/** 找出标题行下标：有标准标记则只用标准标记，否则用裸标题启发式。 */
function findHeadingLines(lines: string[]): number[] {
  const standard: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.length <= HEADING_MAX_LENGTH && STANDARD_HEADING.test(trimmed)) {
      standard.push(i);
    }
  }
  if (standard.length > 0) return standard;

  const candidates: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.length < TITLE_MIN_LENGTH || trimmed.length > TITLE_MAX_LENGTH) continue;
    if (SENTENCE_PUNCT.test(trimmed)) continue;
    if (PUNCT_START.test(trimmed)) continue;
    candidates.push(i);
  }
  // 候选数超过总行数 1/10 视为误判（碎片化文本），放弃启发式整本单章
  return candidates.length <= Math.max(3, lines.length / 10) ? candidates : [];
}

/** 只在正文足够的标题处切分；被跳过的候选行留在上一章正文里，保证零内容丢失。 */
function cutAtMarks(lines: string[], marks: number[]): SplitChapter[] {
  const chapters: SplitChapter[] = [];

  // 首个标题前的引言区（网站广告/作者序）丢弃；无有效切分点则走单章回退
  let openStart = -1;
  let openTitle = "";
  for (let k = 0; k < marks.length; k++) {
    const mark = marks[k];
    const end = k + 1 < marks.length ? marks[k + 1] : lines.length;
    const body = lines.slice(mark + 1, end).join("\n").trim();
    if (body.length < MIN_BODY_LENGTH) continue; // 假标题：不切分，行并入上一章

    if (openStart >= 0) {
      chapters.push({
        title: openTitle,
        content: lines.slice(openStart, mark).join("\n").trim(),
      });
    }
    openStart = mark + 1;
    openTitle = lines[mark].trim();
  }
  if (openStart >= 0) {
    chapters.push({
      title: openTitle,
      content: lines.slice(openStart).join("\n").trim(),
    });
  }
  return chapters;
}

/** 便捷封装：解码 + 拆分（actions 用）。 */
export function parseNovelTxt(buffer: Buffer, fallbackTitle: string): ImportedNovelItem[] {
  return splitChapters(decodeTxt(buffer), fallbackTitle);
}
