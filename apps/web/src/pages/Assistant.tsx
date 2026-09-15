import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { GlassCard, Chip } from "../components/ui";

interface Msg {
  role: string;
  content: string;
}

const suggestions = [
  "What should I do this week?",
  "Show me jobs for me",
  "What's my biggest skill gap?",
  "What do placed students say about TCS?",
  "Recommend free SQL courses",
  "How's my readiness?",
];

export default function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Msg[]>("/chat/history")
      .then(setMessages)
      .catch(() => setMessages([]));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setBusy(true);
    try {
      const res = await api<{ reply: string; source: string }>("/chat", { method: "POST", body: { message: msg } });
      setMessages((m) => [...m, { role: "agent", content: res.reply }]);
      setSource(res.source);
    } catch (e) {
      setMessages((m) => [...m, { role: "agent", content: e instanceof Error ? e.message : "Error" }]);
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <GlassCard className="flex h-[70vh] flex-col overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-lg">🤖</div>
            <div>
              <div className="font-bold">AI Career Counsellor</div>
              <div className="text-[11px] text-slate-500">{source === "ai" ? "✦ AI mode — powered by an LLM" : "⚡ Smart engine mode — knows your real profile data"}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <div className="glass-soft p-4 text-sm text-slate-600">
              👋 Hi! I'm your AI counsellor. I can see your skills, roadmap, and the live job market. Ask me anything — or pick a suggestion below.
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "ml-auto bg-gradient-to-r from-cyan-500/80 to-violet-500/80 text-slate-900"
                  : "bg-slate-900/[0.06] text-slate-800"
              }`}
            >
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="w-24 rounded-2xl bg-slate-900/[0.06] px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-300" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-300 [animation-delay:0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-300 [animation-delay:0.3s]" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-slate-200 px-5 py-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-full bg-slate-900/5 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-900/[0.08] hover:text-slate-900">
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="glass-input flex-1"
              placeholder="Ask your counsellor anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button className="btn-primary !px-5" onClick={() => send()} disabled={busy}>➤</button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
