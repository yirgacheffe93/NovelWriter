"use client";

import { useEffect, useState } from "react";
import {
  getLlmSettingsAction,
  saveLlmSettingsAction,
  testLlmConnectionAction,
  type LlmSettingsSnapshot,
} from "@/features/llm/actions";

/**
 * Settings 弹窗：配置 LiteLLM 网关参数（baseUrl / apiKey / 模型别名）。
 * 打开时加载当前生效值（含来源提示）；保存写入 app_settings，之后覆盖环境变量。
 * 「测试连接」用表单当前值调网关 /v1/models，与是否保存无关。
 */
export default function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [source, setSource] = useState<LlmSettingsSnapshot["source"]>("env");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLlmSettingsAction().then((snapshot) => {
      if (cancelled) return;
      setBaseUrl(snapshot.baseUrl);
      setApiKey(snapshot.apiKey);
      setModel(snapshot.model);
      setSource(snapshot.source);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = loaded && !saving && baseUrl.trim() && apiKey.trim();

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setTestResult(await testLlmConnectionAction({ baseUrl, apiKey }));
    setTesting(false);
  }

  async function handleSave() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await saveLlmSettingsAction({ baseUrl, apiKey, model });
      onClose();
    } catch (cause) {
      // 原型阶段不做错误 UI：弹窗保持打开，用户可重试或取消
      console.error("保存 LLM 设置失败", cause);
      setError("保存失败，请重试");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/20 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="w-full max-w-[480px] rounded-lg border border-zinc-200 bg-white p-5 shadow-xl"
      >
        <h2 className="text-sm font-semibold tracking-tight">Settings</h2>
        <p className="mt-1 text-xs text-zinc-400">
          LLM 网关（LiteLLM）配置
          {source === "env" && " · 当前值来自环境变量，保存后写入本地数据库"}
        </p>

        {!loaded ? (
          <p className="py-6 text-center text-sm text-zinc-400">加载中…</p>
        ) : (
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              handleSave();
            }}
          >
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">网关地址</span>
              <input
                autoFocus
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="http://localhost:4000"
                className="rounded border border-zinc-200 px-2.5 py-1.5 text-sm outline-none placeholder:text-zinc-300 focus:border-zinc-400"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">API Key（网关 master key）</span>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-litellm-..."
                className="rounded border border-zinc-200 px-2.5 py-1.5 text-sm outline-none placeholder:text-zinc-300 focus:border-zinc-400"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">模型别名</span>
              <input
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="novel-writer"
                className="rounded border border-zinc-200 px-2.5 py-1.5 text-sm outline-none placeholder:text-zinc-300 focus:border-zinc-400"
              />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !baseUrl.trim() || !apiKey.trim()}
                className="rounded border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 disabled:border-zinc-200 disabled:text-zinc-300"
              >
                {testing ? "测试中…" : "测试连接"}
              </button>
              {testResult && (
                <span
                  className={`text-xs ${
                    testResult.ok ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {testResult.message}
                </span>
              )}
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="mt-1 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-300"
              >
                保存
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
