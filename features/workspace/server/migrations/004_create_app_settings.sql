-- 应用级设置（KV）：目前只存 Settings 弹窗配置的 LLM 网关参数（llm.baseUrl / llm.apiKey / llm.model）。
-- 与 llm_calls 不同，这是用户主动配置的生效值，不是调用记录（plan.md 的「密钥不入库」指调用记录）。
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
