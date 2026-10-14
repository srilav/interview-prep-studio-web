import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Markdown from "react-markdown";
import type { Message, Thread } from "../../gen/prepstudio/discussion/v1/discussion_pb";
import { discussionClient } from "../../lib/clients";
import { errorMessage } from "../../lib/errors";
import { useLearner } from "../../lib/learner";
import { publish, useStompConnected, useStompTopic } from "../../lib/stomp";

type WireMessage = { id: string; threadId: string; author: string; fromAiTutor: boolean; content: string; postedAt: string };
type Frame =
  | { type: "message"; message: WireMessage }
  | { type: "ai_chunk"; threadId: string; replyId: string; delta: string }
  | { type: "ai_error"; threadId: string; replyId: string; error: string };

type ChatMessage = Pick<WireMessage, "id" | "author" | "fromAiTutor" | "content" | "postedAt">;
type AiStream = { replyId: string; text: string; error?: string };

const toChat = (m: Message | WireMessage): ChatMessage => ({
  id: m.id, author: m.author, fromAiTutor: m.fromAiTutor, content: m.content, postedAt: m.postedAt,
});

export function DiscussionPanel({ keyId, term }: { keyId: string; term: string }) {
  const { name } = useLearner();
  const connected = useStompConnected();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streams, setStreams] = useState<AiStream[]>([]);
  const [draft, setDraft] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setThreadId(null);
    discussionClient
      .listThreads({ keyId })
      .then((r) => {
        setThreads(r.threads);
        setThreadId(r.threads[0]?.id ?? null);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [keyId]);

  useEffect(() => {
    setMessages([]);
    setStreams([]);
    if (!threadId) return;
    discussionClient
      .listMessages({ threadId, limit: 100 })
      .then((r) => setMessages(r.messages.map(toChat)))
      .catch((e) => setError(errorMessage(e)));
  }, [threadId]);

  useStompTopic(threadId ? `/topic/threads/${threadId}` : null, (body) => {
    const frame = body as Frame;
    if (frame.type === "message") {
      const m = toChat(frame.message);
      setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
      if (m.fromAiTutor) {
        // The finished reply replaces its streaming bubble (matched by id, else the oldest one).
        setStreams((s) => {
          const i = s.findIndex((x) => x.replyId === m.id);
          return i >= 0 ? s.filter((_, j) => j !== i) : s.slice(1);
        });
      }
    } else if (frame.type === "ai_chunk") {
      setStreams((s) => {
        const existing = s.find((x) => x.replyId === frame.replyId);
        if (!existing) return [...s, { replyId: frame.replyId, text: frame.delta }];
        return s.map((x) => (x.replyId === frame.replyId ? { ...x, text: x.text + frame.delta } : x));
      });
    } else if (frame.type === "ai_error") {
      setStreams((s) => {
        const existing = s.find((x) => x.replyId === frame.replyId);
        if (!existing) return [...s, { replyId: frame.replyId, text: "", error: frame.error }];
        return s.map((x) => (x.replyId === frame.replyId ? { ...x, error: frame.error } : x));
      });
    }
  });

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, streams]);

  async function openThread(e: FormEvent) {
    e.preventDefault();
    const title = newTitle.trim() || `Questions about ${term}`;
    try {
      const t = await discussionClient.openThread({ keyId, title, openedBy: name });
      setThreads((list) => [t, ...list]);
      setThreadId(t.id);
      setNewTitle("");
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function send(e?: FormEvent) {
    e?.preventDefault();
    const content = draft.trim();
    if (!content || !threadId) return;
    if (content.length > 4000) {
      setError("Messages can be up to 4,000 characters. Split it into two messages.");
      return;
    }
    try {
      publish(`/app/threads/${threadId}/messages`, { author: name, content });
      setDraft("");
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const current = threads.find((t) => t.id === threadId);

  return (
    <aside className="pane discussion" aria-label="Discussion">
      <div className="pane-head">
        <h2>Discussion</h2>
        <span className={"conn" + (connected ? " on" : "")}>{connected ? "Live" : "Connecting…"}</span>
      </div>
      <div className="threads">
        {threads.map((t) => (
          <button key={t.id} type="button" className={"thread-btn" + (t.id === threadId ? " selected" : "")} onClick={() => setThreadId(t.id)}>
            {t.title}
            <small>Started by {t.openedBy}{t.closed ? " · closed" : ""}</small>
          </button>
        ))}
        <form className="row" onSubmit={openThread} style={{ padding: "6px 4px" }}>
          <input type="text" id="new-thread-title" placeholder={threads.length ? "New thread title" : `Start a thread about ${term}`} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} aria-label="New thread title" />
          <button type="submit" className="btn">Start</button>
        </form>
      </div>

      <div className="messages" ref={listRef} aria-live="polite">
        {!threadId && <p className="empty">Start a thread to discuss {term} with other learners and the AI tutor.</p>}
        {threadId && messages.length === 0 && streams.length === 0 && <p className="empty">No messages yet. Ask the first question.</p>}
        {messages.map((m) => (
          <div key={m.id} className={"msg" + (m.fromAiTutor ? " ai" : m.author === name ? " mine" : "")}>
            <span className="meta">{m.fromAiTutor ? <strong>AI tutor</strong> : m.author} · {formatTime(m.postedAt)}</span>
            <div className="bubble">{m.fromAiTutor ? <div className="md"><Markdown>{m.content}</Markdown></div> : m.content}</div>
          </div>
        ))}
        {streams.map((s) => (
          <div key={s.replyId} className="msg ai">
            <span className="meta"><strong>AI tutor</strong> · {s.error ? "failed" : "typing…"}</span>
            <div className="bubble">
              {s.error ? <span className="err">{s.error}</span> : <div className="md cursor"><Markdown>{s.text}</Markdown></div>}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="alert" style={{ margin: "0 10px 8px" }}>{error}</p>}
      <form className="composer" onSubmit={send}>
        <textarea id="composer" rows={2} placeholder={current?.closed ? "This thread is closed." : "Ask a question. Mention @tutor for an AI answer."} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown} disabled={!threadId || current?.closed} aria-label="Message" />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <p className="hint">Enter to send · Shift+Enter for a new line · @tutor asks Haiku</p>
          <button type="submit" className="btn primary" disabled={!threadId || !draft.trim() || !connected}>Send</button>
        </div>
      </form>
    </aside>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
