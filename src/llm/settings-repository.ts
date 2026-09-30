/**
 * LLM 设置仓储：Settings 弹窗配置的网关参数，存 app_settings KV 表。
 * 读取优先级由 resolveLlmConfig 决定（DB 覆盖环境变量，见 ../config.ts）。
 */
import { getDb } from "../storage/db.ts";

export interface LlmSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

const KEYS = {
  baseUrl: "llm.baseUrl",
  apiKey: "llm.apiKey",
  model: "llm.model",
} as const;

/** 已保存的设置；未保存过的键不在返回对象里（用于与 env 兜底合并）。 */
export function getStoredLlmSettings(): Partial<LlmSettings> {
  const rows = getDb()
    .prepare("SELECT key, value FROM app_settings")
    .all() as { key: string; value: string }[];
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  return {
    ...(byKey.has(KEYS.baseUrl) ? { baseUrl: byKey.get(KEYS.baseUrl)! } : {}),
    ...(byKey.has(KEYS.apiKey) ? { apiKey: byKey.get(KEYS.apiKey)! } : {}),
    ...(byKey.has(KEYS.model) ? { model: byKey.get(KEYS.model)! } : {}),
  };
}

/** 全量 upsert 三项设置；调用方负责 trim 与必填校验。 */
export function saveLlmSettings(settings: LlmSettings): void {
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  );
  const now = new Date().toISOString();
  db.exec("BEGIN");
  try {
    upsert.run(KEYS.baseUrl, settings.baseUrl, now);
    upsert.run(KEYS.apiKey, settings.apiKey, now);
    upsert.run(KEYS.model, settings.model, now);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
