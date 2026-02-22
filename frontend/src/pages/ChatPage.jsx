import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Trash2, FileText, Sparkles } from "lucide-react";
import { sendMessage, clearHistory } from "../lib/api";

function CitationBadge({ citation }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors cursor-pointer border border-indigo-500/30"
      >
        <FileText className="w-3 h-3" />
        {citation.document_name}
        <span className="text-indigo-400/60">{Math.round(citation.relevance_score * 100)}%</span>
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-80 p-3 rounded-lg bg-gray-800 border border-gray-700 shadow-xl text-xs text-gray-300 whitespace-pre-wrap">
          {citation.chunk_text}
        </div>
      )}
    </span>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-indigo-600 text-white rounded-br-md"
            : "bg-gray-800 text-gray-100 rounded-bl-md border border-gray-700/50"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>

        {msg.citations?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-700/50">
            {msg.citations.map((c, i) => (
              <CitationBadge key={i} citation={c} />
            ))}
          </div>
        )}

        {msg.meta && (
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-700/50 text-xs text-gray-500">
            {msg.meta.confidence > 0 && (
              <span>Confidence: {Math.round(msg.meta.confidence * 100)}%</span>
            )}
            {msg.meta.tokens_used > 0 && <span>{msg.meta.tokens_used} tokens</span>}
            {msg.meta.latency_ms > 0 && <span>{msg.meta.latency_ms}ms</span>}
          </div>
        )}
      </div>
    </div>
  );
}

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
      try {
        await clearHistory(sessionId);
      } catch (_) {}
    }
    setMessages([]);
    setSessionId(null);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div>
          <h2 className="text-base font-semibold">Chat</h2>
          <p className="text-xs text-gray-500">
            {sessionId ? `Session: ${sessionId}` : "New conversation"}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-300">How can I help?</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md">
              Ask me anything about IT policies, troubleshooting, password resets,
              VPN setup, or any helpdesk topic.
            </p>
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {[
                "How do I reset my password?",
                "VPN not connecting on Mac",
                "Set up email on my phone",
                "Request new software",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    inputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 rounded-full text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-gray-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-700/50">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            </div>
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-md text-center text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-2 border border-red-500/20">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-3 max-w-3xl mx-auto"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={loading}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
