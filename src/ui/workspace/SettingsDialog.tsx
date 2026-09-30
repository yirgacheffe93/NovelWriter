"use client";

import { useEffect, useState } from "react";
import {
  getLlmSettingsAction,
  saveLlmSettingsAction,
  testLlmConnectionAction,
  type LlmSettingsSnapshot,
} from "@/actions/llm";
import {
  getDataDirAction,
  setDataDirAction,
  type DataDirSnapshot,
} from "@/actions/settings";

/**
 * Settings 弹窗，两节互不相关：
 * 1. LLM 网关参数（baseUrl / apiKey / 模型别名）——存在数据库的 app_settings 里；
 * 2. 数据目录——存在仓库根的 .novelwriter.json，因为数据库本身就在那个目录里。
 * 切换数据目录后必须整页重载：服务端连接已换库，客户端状态全部过期。
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

  const [dataDir, setDataDir] = useState("");
  const [dataDirSnapshot, setDataDirSnapshot] =
    useState<DataDirSnapshot | null>(null);
  const [changingDir, setChangingDir] = useState(false);
  const [dataDirError, setDataDirError] = useState<string | null>(null);

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
    getDataDirAction().then((snapshot) => {
      if (cancelled) return;
      setDataDir(snapshot.dataDir);
      setDataDirSnapshot(snapshot);
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

  async function handleChangeDataDir() {
    setChangingDir(true);
    setDataDirError(null);
    try {
      await setDataDirAction(dataDir);
      // 服务端的数据库已经换了，客户端所有缓存（RSC payload、路由缓存、
      // AppShell 的章节 state）同时失效。router.push 会命中路由缓存而显示
      // 旧项目，所以这里要的就是整页重载，不是客户端跳转。
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    } catch (cause) {
      setDataDirError(
        cause instanceof Error ? cause.message : "切换失败，请重试",
      );
      setChangingDir(false);
    }
  }

  const canChangeDir =
    !changingDir &&
    dataDir.trim().length > 0 &&
    dataDir.trim() !== dataDirSnapshot?.dataDir;

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

        <div className="mt-5 border-t border-zinc-200 pt-4">
          <h3 className="text-xs font-semibold text-zinc-600">数据目录</h3>
          <p className="mt-1 text-xs text-zinc-400">
            SQLite 索引、项目配置与章节正文的位置。放在仓库之外，便于单独备份。
            {dataDirSnapshot && !dataDirSnapshot.configured && " 当前为默认目录。"}
          </p>

          <div className="mt-2 flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs text-zinc-500">目录（绝对路径）</span>
              <input
                value={dataDir}
                onChange={(event) => setDataDir(event.target.value)}
                placeholder="/Users/you/Documents/novel_data"
                className="rounded border border-zinc-200 px-2.5 py-1.5 font-mono text-xs outline-none placeholder:text-zinc-300 focus:border-zinc-400"
              />
            </label>
            <button
              type="button"
              onClick={handleChangeDataDir}
              disabled={!canChangeDir}
              className="shrink-0 rounded border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 disabled:border-zinc-200 disabled:text-zinc-300"
            >
              {changingDir ? "切换中…" : "更改"}
            </button>
          </div>

          <p className="mt-2 text-xs text-zinc-400">
            更改后页面会重新加载。指向空目录将显示空工作台，原目录的数据不受影响。
          </p>
          {dataDirError && (
            <p className="mt-1 text-xs text-red-600">{dataDirError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
