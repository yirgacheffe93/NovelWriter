/**
 * Mock 层：真实实现应由 Harness 提供（见 docs/web_ui 第 26 节 Agent API）。
 * 这里只支撑 Phase 1 的界面演示，不含真实模型调用、持久化，也不做写入前的
 * revision / contentHash 校验 —— 真实实现下冲突会落到 GenerationDisposition = "conflict"。
 */
import type { ChatMessage, GenerationDisposition } from "./types";

export type WriteMode = "append" | "replace";

const REPLACE_HINTS = ["重写", "改写", "替换", "重来", "重新写"];

/** 按指令判断写入方式：说「重写」就替换整章，否则追加到末尾。 */
export function decideWriteMode(instruction: string): WriteMode {
  return REPLACE_HINTS.some((hint) => instruction.includes(hint))
    ? "replace"
    : "append";
}

const MOCK_OUTPUTS = [
  `他沿着干涸的河床走了两天。第三天的清晨，远处出现了城墙的轮廓，灰得像是从土里长出来的。

城门开着。没有人守，也没有人进出。

他站在门外，忽然听见身后传来脚步声——很轻，但确实在靠近。

"别进去。"那个人说。`,
  `夜色沉下来的时候，营地里只剩下火堆的噼啪声。

她把地图摊开，指尖压住那个被圈了三次的位置。

"明天到不了。"她说，"除非我们不走大路。"

没有人接话。风把火苗吹得歪向一边，照亮了她手背上那道旧疤。`,
];

/** 按指令长度轮换样例文本，保证连续发送时不会拿到同一段。 */
export function mockGenerate(instruction: string): string {
  return MOCK_OUTPUTS[instruction.length % MOCK_OUTPUTS.length];
}

export function createMessage(
  role: ChatMessage["role"],
  content: string,
  disposition?: GenerationDisposition,
): ChatMessage {
  return {
    id: `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    disposition,
  };
}
