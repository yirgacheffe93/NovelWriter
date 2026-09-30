/**
 * MVP 字数口径：非空白字符数，与编辑器底部字数一致。
 * 服务端 DB 的 word_count 与客户端展示共用此函数，避免两处漂移。
 */
export function countWords(content: string): number {
  return content.replace(/\s/g, "").length;
}
