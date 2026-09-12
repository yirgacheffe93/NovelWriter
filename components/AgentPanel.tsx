"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, PanelRightClose, PanelRightOpen } from "lucide-react";
import type { AgentRunStatus, ChatMessage } from "@/lib/types";

interface AgentPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  messages: ChatMessage[];
  /** null 表示当前没有进行中的 AgentRun */
  status: AgentRunStatus | null;
  onSend: (instruction: string) => void;
}

export default function AgentPanel({
  collapsed,
  onToggle,
  messages,
  status,
  onSend,
}: AgentPanelProps) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const busy = status === "pending" || status === "running";

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, status]);

  function submit() {
    const value = draft.trim();
    if (!value || busy) return;
    onSend(value);
    setDraft("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  if (collapsed) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center border-l border-zinc-200 bg-zinc-50 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label="展开 Agent 面板"
          className="text-zinc-400 transition-colors hover:text-zinc-900"
        >
          <PanelRightOpen size={17} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l border-zinc-200 bg-zinc-50">
      <div className="flex h-9 shrink-0 items-center gap-2 px-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Agent
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-label="折叠 Agent 面板"
          className="ml-auto text-zinc-400 transition-colors hover:text-zinc-900"
        >
          <PanelRightClose size={15} />
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {messages.length === 0 ? (
          <p className="mt-2 text-xs leading-5 text-zinc-400">
            告诉 Agent 你想写什么。生成结果会直接写入编辑器，撤销用编辑器里的 ⌘Z。
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
          </div>
        )}

        {busy && (
          <p className="mt-4 text-xs text-zinc-400">
            {status === "pending" ? "Preparing context..." : "Generating..."}
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-zinc-200 p-3">
        <div className="rounded border border-zinc-200 bg-white focus-within:border-zinc-400">
          <textarea
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="继续写主角进入古城后的剧情"
            className="w-full resize-none bg-transparent px-2.5 py-2 text-sm leading-6 outline-none placeholder:text-zinc-300"
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-[11px] text-zinc-400">
              Enter 发送 · ⇧Enter 换行 · ⌘Z 撤销
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={busy || draft.trim().length === 0}
              aria-label="发送"
              className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-300"
            >
              <ArrowUp size={14} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Message({ message }: { message: ChatMessage }) {
  const time = message.createdAt.slice(11, 16);

  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="text-[11px] text-zinc-400">你 · {time}</span>
        <p className="max-w-[92%] whitespace-pre-wrap rounded bg-white px-2.5 py-1.5 text-sm leading-6 ring-1 ring-zinc-200">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-[11px] text-zinc-400">
        Agent · {time}
        {message.disposition === "applied" && " · 已写入正文"}
        {message.disposition === "conflict" && " · 未写入：正文已变更"}
      </span>
      <p className="max-w-[92%] whitespace-pre-wrap text-sm leading-6 text-zinc-700">
        {message.content}
      </p>
    </div>
  );
}
