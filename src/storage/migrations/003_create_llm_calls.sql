-- llm_calls 表：LLM 调用的业务记录（overview §15.1，llm.md §14）。
-- 与权威 DDL 的唯一偏离：run_id 暂为普通 TEXT、无 agent_runs 外键——
-- agent_runs 依赖尚未存在的 sessions 表（llm-integration-plan.md 步骤 3），AgentRun 迁移
-- 落地后再补外键与「run 与 project/chapter 一致」的跨字段校验。
CREATE TABLE llm_calls (
    id TEXT PRIMARY KEY,

    run_id TEXT,
    project_id TEXT,
    chapter_id TEXT,

    purpose TEXT NOT NULL,

    provider TEXT,
    model TEXT NOT NULL,

    request_json TEXT NOT NULL CHECK (json_valid(request_json)),
    response_json TEXT CHECK (response_json IS NULL OR json_valid(response_json)),

    status TEXT NOT NULL
        CHECK (status IN ('pending', 'running', 'completed', 'failed')),

    input_tokens INTEGER CHECK (input_tokens IS NULL OR input_tokens >= 0),
    output_tokens INTEGER CHECK (output_tokens IS NULL OR output_tokens >= 0),
    total_tokens INTEGER CHECK (total_tokens IS NULL OR total_tokens >= 0),

    cost_micros INTEGER CHECK (cost_micros IS NULL OR cost_micros >= 0),
    cost_currency TEXT,

    latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),

    provider_request_id TEXT,

    error TEXT,

    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,

    CHECK (chapter_id IS NULL OR project_id IS NOT NULL),

    CHECK (
        (status = 'pending' AND started_at IS NULL AND finished_at IS NULL)
        OR
        (status = 'running' AND started_at IS NOT NULL AND finished_at IS NULL)
        OR
        (status IN ('completed', 'failed') AND started_at IS NOT NULL AND finished_at IS NOT NULL)
    ),

    CHECK (
        (status = 'failed' AND error IS NOT NULL)
        OR
        (status <> 'failed' AND error IS NULL)
    ),

    FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (chapter_id)
        REFERENCES chapters(id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_llm_calls_run_created
ON llm_calls(run_id, created_at);
