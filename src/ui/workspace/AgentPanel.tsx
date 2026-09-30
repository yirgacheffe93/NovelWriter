import { ArrowUp, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  sendAgentChatAction,
  type AgentChatMessage,
} from "@/actions/llm";

interface AgentPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  /** 随对话写入 llm_calls 的项目/章节关联（llm-integration-plan.md 步骤 3） */
  projectId: string;
  chapterId: string | null;
}

/** 面板内展示的消息；error 标记来自模型的失败回复（配置缺失/网关不可达等）。 */
interface ChatItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

export default function AgentPanel({
  collapsed,
  onToggle,
  projectId,
  chapterId,
}: AgentPanelProps) {
  // 对话历史只存组件 state（刷新即清空）；runId 让多轮落在同一个会话
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const runIdRef = useRef<string>(crypto.randomUUID());
  const listRef = useRef<HTMLDivElement>(null);

  // 新消息 / 生成中状态变化时滚到底部
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const userMessage: ChatItem = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const history: AgentChatMessage[] = [...messages, userMessage].map(
      (item) => ({ role: item.role, content: item.content }),
    );
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);
    try {
      const { content } = await sendAgentChatAction({
        runId: runIdRef.current,
        projectId,
        chapterId: chapterId ?? undefined,
        history,
      });
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content },
      ]);
    } catch (cause) {
      // 配置缺失/连接失败等在消息流内呈现，不打断写作
      console.error("Agent 对话失败", cause);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `请求失败：${cause instanceof Error ? cause.message : String(cause)}`,
          error: true,
        },
      ]);
    } finally {
      setSending(false);
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

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {messages.length === 0 && !sending && (
          <p className="mt-2 text-xs leading-5 text-zinc-400">
            开始与 Agent 对话，它会使用 Settings 中配置的模型回复。
          </p>
        )}

        {messages.map((item) => (
          <ChatBubble key={item.id} item={item} />
        ))}

        {sending && <ChatBubble pending />}
      </div>

      <div className="shrink-0 border-t border-zinc-200 p-3">
        <div className="rounded border border-zinc-200 bg-white">
          <textarea
            rows={2}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              // Enter 发送，⇧Enter 换行（web-ui.md §14）
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder="输入指令…"
            className="w-full resize-none bg-transparent px-2.5 py-2 text-sm leading-6 outline-none placeholder:text-zinc-300"
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-[11px] text-zinc-400">
              {sending ? "生成中…" : "Enter 发送 · ⇧Enter 换行"}
            </span>
            <button
              type="button"
              onClick={send}
              disabled={sending || !input.trim()}
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

function ChatBubble({
  item,
  pending = false,
}: {
  item?: ChatItem;
  pending?: boolean;
}) {
  if (pending) {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" />
        生成中…
      </div>
    );
  }
  if (!item) return null;
  if (item.role === "user") {
    return (
      <div className="mt-2 flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-lg rounded-br-sm bg-zinc-900 px-2.5 py-1.5 text-sm leading-6 text-white">
          {item.content}
        </p>
      </div>
    );
  }
  return (
    <div className="mt-2 flex">
      <p
        className={`max-w-[95%] whitespace-pre-wrap rounded-lg rounded-bl-sm bg-white px-2.5 py-1.5 text-sm leading-6 shadow-sm ring-1 ring-zinc-200 ${
          item.error ? "text-red-600" : "text-zinc-800"
        }`}
      >
        {item.content}
      </p>
    </div>
  );
}
