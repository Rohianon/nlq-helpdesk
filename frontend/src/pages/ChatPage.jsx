import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Trash2, FileText, Zap, ArrowRight, Bot, User, Clock, Gauge, Coins } from "lucide-react";
import { sendMessage, clearHistory } from "../lib/api";

function CitationBadge({ citation, index }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-lg text-[11px] font-mono
          bg-cyan-ghost border border-cyan-glow/20 text-cyan-dim
          hover:bg-cyan-tint hover:border-cyan-glow/40 hover:text-cyan-glow
          transition-all duration-200 cursor-pointer group"
      >
        <span className="w-4 h-4 rounded bg-cyan-glow/10 flex items-center justify-center text-[9px] font-bold text-cyan-glow">
          {index + 1}
        </span>
        <span className="max-w-[140px] truncate">{citation.document_name}</span>
        <span className="text-cyan-glow/40 group-hover:text-cyan-glow/70 transition-colors">
          {Math.round(citation.relevance_score * 100)}%
        </span>
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-96 animate-fade-up">
          <div className="p-4 rounded-xl glass border border-iron/50 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-2 mb-2 text-[10px] font-mono uppercase tracking-wider text-mist/50">
              <FileText className="w-3 h-3" />
              Source excerpt
            </div>
            <p className="text-xs text-fog/80 leading-relaxed whitespace-pre-wrap font-body">
              {citation.chunk_text}
            </p>
          </div>
        </div>
      )}
    </span>
  );
}

function MessageBubble({ msg, index }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} mb-5 animate-fade-up`}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-ghost border border-cyan-glow/20 flex items-center justify-center mt-1">
          <Bot className="w-4 h-4 text-cyan-glow" />
        </div>
      )}

      <div className={`max-w-[65%] ${isUser ? "order-first" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-gradient-to-br from-cyan-glow/15 to-cyan-glow/5 border border-cyan-glow/20 rounded-tr-md"
              : "bg-deep border border-iron/50 rounded-tl-md"
          }`}
        >
          <p className="text-[13px] whitespace-pre-wrap leading-[1.7] text-cloud/90">{msg.content}</p>

          {msg.citations?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-iron/30">
              {msg.citations.map((c, i) => (
                <CitationBadge key={i} citation={c} index={i} />
              ))}
            </div>
          )}
        </div>

        {msg.meta && (
          <div className="flex items-center gap-3 mt-1.5 px-1 text-[10px] font-mono text-mist/40">
            {msg.meta.confidence > 0 && (
              <span className="flex items-center gap-1">
                <Gauge className="w-3 h-3" />
                {Math.round(msg.meta.confidence * 100)}%
              </span>
            )}
            {msg.meta.tokens_used > 0 && (
              <span className="flex items-center gap-1">
                <Coins className="w-3 h-3" />
                {msg.meta.tokens_used}
              </span>
            )}
            {msg.meta.latency_ms > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {msg.meta.latency_ms}ms
              </span>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate border border-iron/50 flex items-center justify-center mt-1">
          <User className="w-4 h-4 text-mist" />
        </div>
      )}
    </div>
  );
}

const SUGGESTIONS = [
  { text: "How do I reset my password?", icon: "🔑" },
  { text: "VPN not connecting on Mac", icon: "🌐" },
  { text: "Set up email on my phone", icon: "📱" },
  { text: "Request new software", icon: "💻" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await sendMessage(text, sessionId);
      setSessionId(res.session_id);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.response,
          citations: res.citations,
          meta: {
            confidence: res.confidence,
            tokens_used: res.tokens_used,
            latency_ms: res.latency_ms,
          },
        },
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClear = async () => {
    if (sessionId) {
      try { await clearHistory(sessionId); } catch (_) {}
    }
    setMessages([]);
    setSessionId(null);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-iron/30 glass z-10">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-base font-semibold text-cloud">Chat</h2>
          <div className="h-4 w-px bg-iron/50" />
          <span className="text-[10px] font-mono text-mist/50 uppercase tracking-wider">
            {sessionId ? `Session ${sessionId.slice(0, 8)}` : "New conversation"}
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              text-mist/50 hover:text-rose-glow hover:bg-rose-ghost
              border border-transparent hover:border-rose-glow/20 transition-all duration-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-up">
            {/* Hero icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-ghost to-transparent border border-cyan-glow/20 flex items-center justify-center glow-cyan">
                <Zap className="w-9 h-9 text-cyan-glow" />
              </div>
              <div className="absolute -inset-4 bg-cyan-glow/5 rounded-3xl blur-xl -z-10" />
            </div>

            <h3 className="font-display text-2xl font-bold text-cloud tracking-tight">
              How can I help?
            </h3>
            <p className="text-sm text-mist/60 mt-2 max-w-md leading-relaxed">
              Ask anything about IT policies, troubleshooting, password resets,
              VPN setup, or any helpdesk topic.
            </p>

            {/* Suggestion cards */}
            <div className="grid grid-cols-2 gap-2.5 mt-8 max-w-lg w-full stagger">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => {
                    setInput(s.text);
                    inputRef.current?.focus();
                  }}
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl
                    bg-deep border border-iron/40 hover:border-cyan-glow/30
                    hover:bg-cyan-ghost transition-all duration-200 text-left"
                >
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-xs text-mist group-hover:text-cloud transition-colors flex-1">
                    {s.text}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-iron group-hover:text-cyan-glow transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} index={i} />
        ))}

        {loading && (
          <div className="flex gap-3 mb-5 animate-fade-up">
            <div className="w-8 h-8 rounded-lg bg-cyan-ghost border border-cyan-glow/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-cyan-glow" />
            </div>
            <div className="bg-deep border border-iron/50 rounded-2xl rounded-tl-md px-4 py-3">
              <span className="cursor-blink text-sm text-mist/60">Thinking</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-md text-center text-sm text-rose-glow bg-rose-ghost rounded-xl px-4 py-3 border border-rose-glow/20 animate-fade-up">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-iron/30 glass">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-3 max-w-3xl mx-auto"
        >
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={loading}
              className="w-full bg-deep border border-iron/50 rounded-xl px-4 py-3 text-sm text-cloud
                placeholder-mist/30 font-body
                focus:outline-none focus:border-cyan-glow/40 focus:shadow-[0_0_0_3px_rgba(0,229,255,0.08)]
                disabled:opacity-40 transition-all duration-200"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 rounded-xl bg-gradient-to-br from-cyan-glow/20 to-cyan-glow/10
              border border-cyan-glow/30 text-cyan-glow
              hover:from-cyan-glow/30 hover:to-cyan-glow/15 hover:border-cyan-glow/50
              disabled:opacity-20 disabled:cursor-not-allowed
              transition-all duration-200 glow-cyan"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
