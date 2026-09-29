/**
 * llm_calls 仓储：LLMService 是唯一写入入口（llm.md §14）。
 * request / response 按 JSON 直接存 SQLite（MVP 不拆文件，llm.md §16）；
 * 密钥与 Authorization 永不入库（llm.md §22）。
 * 状态转换由专用函数推进：insert pending → running → completed | failed。
 */
import { getDb } from "../../workspace/server/db.ts";
import type { LLMRequest, LLMResponse } from "../types.ts";

interface LLMCallRow {
  id: string;
  run_id: string | null;
  project_id: string | null;
  chapter_id: string | null;
  purpose: string;
  provider: string | null;
  model: string;
  request_json: string;
  response_json: string | null;
  status: "pending" | "running" | "completed" | "failed";
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  cost_micros: number | null;
  cost_currency: string | null;
  latency_ms: number | null;
  provider_request_id: string | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface NewLLMCall {
  id: string;
  runId?: string;
  projectId?: string;
  chapterId?: string;
  purpose: string;
  provider?: string;
  model: string;
  request: LLMRequest;
  createdAt: string;
}

export function insertPendingCall(call: NewLLMCall): void {
  getDb()
    .prepare(
      `INSERT INTO llm_calls
        (id, run_id, project_id, chapter_id, purpose, provider, model,
         request_json, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(
      call.id,
      call.runId ?? null,
      call.projectId ?? null,
      call.chapterId ?? null,
      call.purpose,
      call.provider ?? null,
      call.model,
      JSON.stringify(call.request),
      call.createdAt,
    );
}

export function markCallRunning(id: string, startedAt: string): void {
  const result = getDb()
    .prepare(
      "UPDATE llm_calls SET status = 'running', started_at = ? WHERE id = ? AND status = 'pending'",
    )
    .run(startedAt, id);
  if (result.changes === 0) {
    throw new Error(`LLMCall 不在 pending 状态：${id}`);
  }
}

export function completeCall(
  id: string,
  data: {
    response: LLMResponse;
    latencyMs: number;
    finishedAt: string;
  },
): void {
  const usage = data.response.usage;
  getDb()
    .prepare(
      `UPDATE llm_calls SET
        status = 'completed',
        response_json = ?,
        input_tokens = ?, output_tokens = ?, total_tokens = ?,
        cost_micros = ?, cost_currency = ?,
        latency_ms = ?,
        provider_request_id = ?,
        finished_at = ?
       WHERE id = ? AND status = 'running'`,
    )
    .run(
      JSON.stringify(data.response),
      usage?.inputTokens ?? null,
      usage?.outputTokens ?? null,
      usage?.totalTokens ?? null,
      usage?.costMicros ?? null,
      usage?.costCurrency ?? null,
      data.latencyMs,
      data.response.providerRequestId ?? null,
      data.finishedAt,
      id,
    );
}

export function failCall(
  id: string,
  data: { error: string; finishedAt: string },
): void {
  getDb()
    .prepare(
      "UPDATE llm_calls SET status = 'failed', error = ?, finished_at = ? WHERE id = ? AND status = 'running'",
    )
    .run(data.error, data.finishedAt, id);
}

/** 查询单条记录（测试与调试用；返回 null 表示不存在）。 */
export function getCall(id: string): LLMCallRow | null {
  return (
    (getDb()
      .prepare("SELECT * FROM llm_calls WHERE id = ?")
      .get(id) as unknown as LLMCallRow | undefined) ?? null
  );
}
