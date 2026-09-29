/**
 * LiteLLMClient 测试（node:test，本地 mock HTTP 服务，无外部依赖）。
 * 覆盖 plan.md 步骤 2 验收：请求映射、成功响应、超时/取消、错误归一化，
 * 以及未实现字段的明确拒绝。
 */
import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { getLlmConfig } from "./config.ts";
import {
  LLMConfigError,
  LLMConnectionError,
  LLMHttpError,
  LLMInvalidResponseError,
  LLMTimeoutError,
  LLMUnsupportedError,
} from "./errors.ts";
import { LiteLLMClient } from "./litellm-client.ts";

const CONFIG = { baseUrl: "http://unused", apiKey: "test-key", model: "novel-writer" };

/** 启动一次性 mock 服务；返回 { port, close, captured }。 */
function startServer(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
) {
  const captured = { method: "", url: "", headers: {} as http.IncomingHttpHeaders, body: "" };
  const server = http.createServer((req, res) => {
    captured.method = req.method ?? "";
    captured.url = req.url ?? "";
    captured.headers = req.headers;
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      captured.body = Buffer.concat(chunks).toString("utf8");
      handler(req, res);
    });
  });
  return new Promise<{
    port: number;
    close: () => Promise<void>;
    captured: typeof captured;
  }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        port,
        close: () => new Promise((done) => server.close(() => done())),
        captured,
      });
    });
  });
}

const OK_BODY = JSON.stringify({
  id: "chatcmpl-1",
  choices: [
    { message: { content: "生成结果" }, finish_reason: "stop" },
  ],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
});

test("请求映射：路径、鉴权头与参数", async () => {
  const server = await startServer((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(OK_BODY);
  });
  try {
    const client = new LiteLLMClient({ ...CONFIG, baseUrl: `http://127.0.0.1:${server.port}` });
    await client.generate({
      model: "novel-writer",
      messages: [
        { role: "system", content: "你是小说助手" },
        { role: "user", content: "继续写" },
      ],
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 500,
    });

    assert.equal(server.captured.method, "POST");
    assert.equal(server.captured.url, "/v1/chat/completions");
    assert.equal(server.captured.headers.authorization, "Bearer test-key");
    const body = JSON.parse(server.captured.body);
    assert.equal(body.model, "novel-writer");
    assert.deepEqual(body.messages, [
      { role: "system", content: "你是小说助手" },
      { role: "user", content: "继续写" },
    ]);
    assert.equal(body.temperature, 0.7);
    assert.equal(body.top_p, 0.9);
    assert.equal(body.max_tokens, 500);
  } finally {
    await server.close();
  }
});

test("成功响应映射：内容、finish_reason、usage、费用、请求 ID", async () => {
  const server = await startServer((_req, res) => {
    res.writeHead(200, {
      "content-type": "application/json",
      "x-litellm-response-cost": "0.00123",
    });
    res.end(OK_BODY);
  });
  try {
    const client = new LiteLLMClient({ ...CONFIG, baseUrl: `http://127.0.0.1:${server.port}` });
    const response = await client.generate({
      model: "novel-writer",
      messages: [{ role: "user", content: "hi" }],
    });

    assert.equal(response.content, "生成结果");
    assert.equal(response.finishReason, "stop");
    assert.deepEqual(response.usage, {
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      costMicros: 1230,
      costCurrency: "USD",
    });
    assert.equal(response.providerRequestId, "chatcmpl-1");
  } finally {
    await server.close();
  }
});

test("无费用头：usage 不包含 cost（未知费用不记为零）", async () => {
  const server = await startServer((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(OK_BODY);
  });
  try {
    const client = new LiteLLMClient({ ...CONFIG, baseUrl: `http://127.0.0.1:${server.port}` });
    const response = await client.generate({
      model: "novel-writer",
      messages: [{ role: "user", content: "hi" }],
    });
    assert.deepEqual(response.usage, {
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    });
  } finally {
    await server.close();
  }
});

test("HTTP 错误：只保留状态码，不泄漏响应体", async () => {
  const server = await startServer((_req, res) => {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: "secret-token-泄露标记" } }));
  });
  try {
    const client = new LiteLLMClient({ ...CONFIG, baseUrl: `http://127.0.0.1:${server.port}` });
    await assert.rejects(
      client.generate({ model: "novel-writer", messages: [] }),
      (error: unknown) => {
        assert.ok(error instanceof LLMHttpError);
        assert.equal((error as LLMHttpError).status, 401);
        assert.ok(!error.message.includes("secret-token"));
        assert.ok(!error.message.includes("泄露标记"));
        return true;
      },
    );
  } finally {
    await server.close();
  }
});

test("非法 JSON 与缺少 choices：归一化为 LLMInvalidResponseError", async () => {
  const server = await startServer((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end("not-json");
  });
  try {
    const client = new LiteLLMClient({ ...CONFIG, baseUrl: `http://127.0.0.1:${server.port}` });
    await assert.rejects(
      client.generate({ model: "novel-writer", messages: [] }),
      LLMInvalidResponseError,
    );
  } finally {
    await server.close();
  }

  const server2 = await startServer((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ choices: [] }));
  });
  try {
    const client = new LiteLLMClient({ ...CONFIG, baseUrl: `http://127.0.0.1:${server2.port}` });
    await assert.rejects(
      client.generate({ model: "novel-writer", messages: [] }),
      LLMInvalidResponseError,
    );
  } finally {
    await server2.close();
  }
});

test("网关超时：抛 LLMTimeoutError", async () => {
  // 服务端收到请求后不响应，直到被关闭
  const server = await startServer(() => {});
  try {
    const client = new LiteLLMClient(
      { ...CONFIG, baseUrl: `http://127.0.0.1:${server.port}` },
      50,
    );
    await assert.rejects(
      client.generate({ model: "novel-writer", messages: [] }),
      (error: unknown) => {
        assert.ok(error instanceof LLMTimeoutError);
        assert.ok(error.message.includes("超时"));
        return true;
      },
    );
  } finally {
    await server.close();
  }
});

test("调用方取消：转发 AbortSignal，抛取消错误", async () => {
  const server = await startServer(() => {});
  try {
    const client = new LiteLLMClient({ ...CONFIG, baseUrl: `http://127.0.0.1:${server.port}` });
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      client.generate(
        { model: "novel-writer", messages: [] },
        { signal: controller.signal },
      ),
      (error: unknown) => {
        assert.ok(error instanceof LLMTimeoutError);
        assert.ok(error.message.includes("取消"));
        return true;
      },
    );
  } finally {
    await server.close();
  }
});

test("未实现字段：tools / responseFormat 明确拒绝，不发请求", async () => {
  let hit = false;
  const server = await startServer((_req, res) => {
    hit = true;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(OK_BODY);
  });
  try {
    const client = new LiteLLMClient({ ...CONFIG, baseUrl: `http://127.0.0.1:${server.port}` });
    await assert.rejects(
      client.generate({
        model: "novel-writer",
        messages: [],
        tools: [{ type: "function" }],
      }),
      LLMUnsupportedError,
    );
    await assert.rejects(
      client.generate({
        model: "novel-writer",
        messages: [],
        responseFormat: { type: "json_object" },
      }),
      LLMUnsupportedError,
    );
    assert.equal(hit, false);
  } finally {
    await server.close();
  }
});

test("连接失败：归一化为 LLMConnectionError", async () => {
  // 先占一个端口再关闭，保证指向的是没有监听的地址
  const server = await startServer(() => {});
  const port = server.port;
  await server.close();

  const client = new LiteLLMClient({ ...CONFIG, baseUrl: `http://127.0.0.1:${port}` });
  await assert.rejects(
    client.generate({ model: "novel-writer", messages: [] }),
    (error: unknown) => {
      assert.ok(error instanceof LLMConnectionError);
      assert.ok(!error.message.includes(CONFIG.apiKey));
      return true;
    },
  );
});

test("配置：缺失变量抛 LLMConfigError，默认模型为 novel-writer", () => {
  assert.throws(() => getLlmConfig({}), LLMConfigError);
  assert.throws(() => getLlmConfig({ LITELLM_API_KEY: "k" }), LLMConfigError);
  assert.throws(() => getLlmConfig({ LITELLM_BASE_URL: "http://x" }), LLMConfigError);

  const config = getLlmConfig({
    LITELLM_BASE_URL: "http://localhost:4000/",
    LITELLM_API_KEY: "k",
  });
  assert.equal(config.baseUrl, "http://localhost:4000");
  assert.equal(config.model, "novel-writer");
});
