import { useEffect, useRef, useState } from "react";
import { api } from "../api";

interface Msg {
  role: string;
  content: string;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      api<Msg[]>("/chat/history")
        .then(setMessages)
        .catch(() => setMessages([]));
    }
  }, [open, messages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const res = await api<{ reply: string; source: string }>("/chat", {
        method: "POST",
        body: { message: text },
      });
      setMessages((m) => [...m, { role: "agent", content: res.reply }]);
      setSource(res.source);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "agent", content: e instanceof Error ? e.message : "Something went wrong." },
      ]);
    }
    setBusy(false);
  };

  return (
    <>
      {/* floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full
          bg-gradient-to-r from-cyan-500 to-violet-500 text-2xl shadow-xl shadow-cyan-500/30
          hover:scale-105 active:scale-95 transition-transform"
        aria-label="AI Career Counsellor"
      >
        {open ? "✕" : "🤖"}
      </button>

      {open && (
        <div className="glass fixed bottom-24 right-5 z-50 flex h-[520px] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden !rounded-3xl animate-fade-up">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">AI Career Counsellor</div>
                <div className="text-[11px] text-slate-500">
                  {source === "ai" ? "✦ LLM-powered" : "⚡ Smart engine mode"}
                </div>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow shadow-emerald-400/50" />
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="glass-soft px-3 py-2 text-sm text-slate-600">
                👋 Ask me anything — "what should I do this week?", "show me jobs", "what do placed students say about TCS?"
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-gradient-to-r from-cyan-500/80 to-violet-500/80 text-slate-900"
                    : "bg-slate-900/[0.06] text-slate-800"
                }`}
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="w-20 rounded-2xl bg-slate-900/[0.06] px-3.5 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-300" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-300 [animation-delay:0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-300 [animation-delay:0.3s]" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="border-t border-slate-200 p-3">
            <div className="flex gap-2">
              <input
                className="glass-input flex-1"
                placeholder="Ask your counsellor…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <button className="btn-primary !px-4" onClick={send} disabled={busy}>
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
