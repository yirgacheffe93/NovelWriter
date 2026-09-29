/**
 * LLM 设置持久化与配置解析测试。
 * NOVELWRITER_DB_PATH 指向临时库（getDb 惰性初始化，静态 import 后再设 env 也来得及）。
 * getDb 是进程内单例，同一文件里无法切换库，因此用例按「先空库、后写入」的顺序编排：
 * 前三条验证空库下的 env 兜底与报错，后三条验证保存、DB 覆盖 env 与覆盖写。
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveLlmConfig } from "./config.ts";
import { LLMConfigError } from "./errors.ts";
import {
  getStoredLlmSettings,
  saveLlmSettings,
} from "./server/settings-repository.ts";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "novelwriter-test-"));
process.env.NOVELWRITER_DB_PATH = path.join(tempDir, "test.db");

test("getStoredLlmSettings：初始无记录返回空对象", () => {
  assert.deepEqual(getStoredLlmSettings(), {});
});

test("resolveLlmConfig：无 DB 记录时回退 env（baseUrl 去尾斜杠）", async () => {
  const config = await resolveLlmConfig({
    LITELLM_BASE_URL: "http://env-host:4000/",
    LITELLM_API_KEY: "sk-env",
    LLM_MODEL: "env-model",
  });
  assert.deepEqual(config, {
    baseUrl: "http://env-host:4000",
    apiKey: "sk-env",
    model: "env-model",
  });
});

test("resolveLlmConfig：DB 与 env 都缺 baseUrl / apiKey 时抛 LLMConfigError", async () => {
  await assert.rejects(
    () => resolveLlmConfig({ LITELLM_BASE_URL: "", LITELLM_API_KEY: "" }),
    LLMConfigError,
  );
});

test("saveLlmSettings：保存后可完整读取", () => {
  saveLlmSettings({
    baseUrl: "http://localhost:4000",
    apiKey: "sk-test-1",
    model: "novel-writer",
  });
  assert.deepEqual(getStoredLlmSettings(), {
    baseUrl: "http://localhost:4000",
    apiKey: "sk-test-1",
    model: "novel-writer",
  });
});

test("resolveLlmConfig：DB 覆盖 env 的同名字段", async () => {
  const config = await resolveLlmConfig({
    LITELLM_BASE_URL: "http://env-host:4000",
    LITELLM_API_KEY: "sk-env",
    LLM_MODEL: "env-model",
  });
  assert.deepEqual(config, {
    baseUrl: "http://localhost:4000",
    apiKey: "sk-test-1",
    model: "novel-writer",
  });
});

test("saveLlmSettings：重复保存覆盖旧值", () => {
  saveLlmSettings({
    baseUrl: "http://localhost:5000",
    apiKey: "sk-test-2",
    model: "other-model",
  });
  assert.deepEqual(getStoredLlmSettings(), {
    baseUrl: "http://localhost:5000",
    apiKey: "sk-test-2",
    model: "other-model",
  });
});
