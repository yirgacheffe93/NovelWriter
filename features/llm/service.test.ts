/**
 * LLMService 测试（plan.md 步骤 3 验收）：
 * 成功与失败调用各只产生一条状态正确的记录，关联信息、用量与耗时可查询。
 * 通过 NOVELWRITER_DB_PATH 指向临时库，不污染 data/novelwriter.db。
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { LLMClient } from "./client.ts";
import { getDb } from "../workspace/server/db.ts";
import { DefaultLLMService } from "./service.ts";
import type { LLMRequest, LLMResponse } from "./types.ts";

// 必须先于任何 getDb() 调用设置（db.ts 在首次 getDb 时读取并缓存连接）
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "novelwriter-test-"));
process.env.NOVELWRITER_DB_PATH = path.join(tmpDir, "test.db");

test.after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

class FakeClient implements LLMClient {
  response: LLMResponse = {
    content: "生成结果",
    finishReason: "stop",
    usage: { inputTokens: 7, outputTokens: 3, totalTokens: 10 },
    providerRequestId: "req-1",
  };
  fail = false;

  async generate(): Promise<LLMResponse> {
    if (this.fail) throw new Error("模拟供应商故障");
    return this.response;
  }
}

const REQUEST: LLMRequest = {
  model: "novel-writer",
  messages: [{ role: "user", content: "继续写" }],
};

test("成功调用：一条 completed 记录，请求/响应/用量/耗时完整", async () => {
  const client = new FakeClient();
  const service = new DefaultLLMService(client);
  const response = await service.generate(REQUEST, {
    purpose: "chapter_writing",
    projectId: "project_1",
    chapterId: "chapter_1",
  });

  assert.equal(response.content, "生成结果");
  const all = getDb()
    .prepare("SELECT * FROM llm_calls WHERE status = 'completed'")
    .all() as unknown as Record<string, unknown>[];
  assert.equal(all.length, 1);
  const record = all[0];

  assert.equal(record.purpose, "chapter_writing");
  assert.equal(record.project_id, "project_1");
  assert.equal(record.chapter_id, "chapter_1");
  assert.equal(record.provider, "litellm");
  assert.equal(record.model, "novel-writer");
  assert.deepEqual(JSON.parse(record.request_json as string), REQUEST);
  assert.deepEqual(JSON.parse(record.response_json as string), client.response);
  assert.equal(record.input_tokens, 7);
  assert.equal(record.output_tokens, 3);
  assert.equal(record.total_tokens, 10);
  assert.ok((record.latency_ms as number) >= 0);
  assert.equal(record.provider_request_id, "req-1");
  assert.equal(record.error, null);
  assert.ok(record.started_at);
  assert.ok(record.finished_at);
});

test("失败调用：一条 failed 记录，error 落库、无响应", async () => {
  // 前一个测试已写入一条，先确认本次前基线
  const before = getDb().prepare("SELECT COUNT(*) AS n FROM llm_calls").get() as unknown as { n: number };

  const client = new FakeClient();
  client.fail = true;
  const service = new DefaultLLMService(client);
  await assert.rejects(
    service.generate(REQUEST, { purpose: "chapter_writing" }),
    /模拟供应商故障/,
  );

  const failed = getDb()
    .prepare("SELECT * FROM llm_calls WHERE status = 'failed'")
    .all() as unknown as Record<string, unknown>[];
  assert.equal(failed.length, 1);
  const after = getDb().prepare("SELECT COUNT(*) AS n FROM llm_calls").get() as unknown as { n: number };
  assert.equal(after.n, before.n + 1);
  assert.equal(failed[0].error, "模拟供应商故障");
  assert.equal(failed[0].response_json, null);
  assert.ok(failed[0].finished_at);
});

test("参数校验失败：不产生任何记录", async () => {
  const before = getDb().prepare("SELECT COUNT(*) AS n FROM llm_calls").get() as unknown as { n: number };
  const service = new DefaultLLMService(new FakeClient());

  await assert.rejects(
    service.generate(REQUEST, { purpose: "  " }),
    /purpose 不能为空/,
  );
  await assert.rejects(
    service.generate(REQUEST, { purpose: "x", chapterId: "chapter_1" }),
    /chapterId 必须伴随 projectId/,
  );

  const after = getDb().prepare("SELECT COUNT(*) AS n FROM llm_calls").get() as unknown as { n: number };
  assert.equal(after.n, before.n);
});

test("每次调用产生新的 LLMCall（业务性重试不共用记录）", async () => {
  const before = getDb().prepare("SELECT COUNT(*) AS n FROM llm_calls").get() as unknown as { n: number };
  const service = new DefaultLLMService(new FakeClient());
  await service.generate(REQUEST, { purpose: "chapter_writing" });
  await service.generate(REQUEST, { purpose: "chapter_review" });

  const after = getDb().prepare("SELECT COUNT(*) AS n FROM llm_calls").get() as unknown as { n: number };
  assert.equal(after.n, before.n + 2);
  const purposes = (
    getDb()
      .prepare("SELECT DISTINCT purpose FROM llm_calls ORDER BY created_at DESC LIMIT 2")
      .all() as unknown as { purpose: string }[]
  ).map((row) => row.purpose);
  assert.deepEqual(purposes, ["chapter_review", "chapter_writing"]);
});
