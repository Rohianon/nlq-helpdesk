import { useState, useEffect } from "react";
import { Loader2, TrendingUp, Clock, Shield, Zap, Hash, ChevronLeft, ChevronRight } from "lucide-react";
import { getAnalyticsSummary, getAuditLog, getTokenUsage } from "../lib/api";

function StatCard({ icon: Icon, label, value, sub, color }) {
  const styles = {
    cyan: { bg: "bg-cyan-ghost", border: "border-cyan-glow/20", icon: "text-cyan-glow", glow: "glow-cyan" },
    amber: { bg: "bg-amber-ghost", border: "border-amber-glow/20", icon: "text-amber-glow", glow: "glow-amber" },
    green: { bg: "bg-green-ghost", border: "border-green-glow/20", icon: "text-green-glow", glow: "" },
    rose: { bg: "bg-rose-ghost", border: "border-rose-glow/20", icon: "text-rose-glow", glow: "" },
  }[color];

  return (
    <div className={`relative p-5 rounded-2xl bg-deep border border-iron/30 overflow-hidden group hover:${styles.border} transition-all duration-300`}>
      <div className={`absolute top-0 right-0 w-24 h-24 ${styles.bg} rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-50 group-hover:opacity-100 transition-opacity`} />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-8 h-8 rounded-lg ${styles.bg} ${styles.border} border flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${styles.icon}`} />
          </div>
        </div>
        <p className="font-display text-2xl font-bold text-cloud">{value}</p>
        <p className="text-[10px] font-mono uppercase tracking-wider text-mist/40 mt-1">{label}</p>
        {sub && <p className="text-[11px] text-mist/50 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function TokenChart({ data }) {
  if (!data.length) return null;
  const maxTokens = Math.max(...data.map((d) => d.tokens));

  return (
    <div className="p-5 rounded-2xl bg-deep border border-iron/30">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-sm font-semibold text-cloud">Token Usage</h3>
        <span className="text-[10px] font-mono text-mist/40 uppercase tracking-wider">Last 30 days</span>
      </div>
      <div className="flex items-end gap-[3px] h-36">
        {data.map((d, i) => {
          const pct = maxTokens ? (d.tokens / maxTokens) * 100 : 0;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center group relative cursor-crosshair">
              <div
                className="w-full rounded-sm bg-gradient-to-t from-cyan-glow/20 to-cyan-glow/40
                  group-hover:from-cyan-glow/40 group-hover:to-cyan-glow/60 transition-all duration-150"
                style={{
                  height: `${pct}%`,
                  minHeight: "2px",
                  animationDelay: `${i * 20}ms`,
                }}
              />
              <div className="absolute bottom-full mb-3 hidden group-hover:block z-20 animate-fade-up">
                <div className="glass border border-iron/50 rounded-lg px-3 py-2 text-[10px] font-mono whitespace-nowrap shadow-xl shadow-black/50">
                  <p className="text-cloud font-medium">{d.date}</p>
                  <p className="text-cyan-glow">{d.tokens.toLocaleString()} tokens</p>
                  <p className="text-mist/50">{d.queries} queries</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-[9px] font-mono text-mist/25">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [audit, setAudit] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([getAnalyticsSummary(), getAuditLog(1), getTokenUsage()])
      .then(([s, a, t]) => { setSummary(s); setAudit(a); setTokens(t.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadPage = async (p) => {
    setPage(p);
    const a = await getAuditLog(p);
    setAudit(a);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-mist/30" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 px-6 py-3 border-b border-iron/30 glass z-10">
        <h2 className="font-display text-base font-semibold text-cloud">Analytics</h2>
        <div className="h-4 w-px bg-iron/50" />
        <span className="text-[10px] font-mono text-mist/50 uppercase tracking-wider">
          Usage Metrics & Audit
        </span>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Stats grid */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
            <StatCard icon={Hash} label="Total Queries" value={summary.total_queries} sub={`${summary.queries_today} today`} color="cyan" />
            <StatCard icon={Clock} label="Avg Latency" value={`${summary.avg_latency_ms}ms`} color="green" />
            <StatCard icon={TrendingUp} label="Avg Confidence" value={`${Math.round(summary.avg_confidence * 100)}%`} color="amber" />
            <StatCard icon={Zap} label="Total Tokens" value={summary.total_tokens.toLocaleString()} color="rose" />
          </div>
        )}

        <TokenChart data={tokens} />

        {/* Guardrail triggers */}
        {summary && Object.keys(summary.guardrail_triggers).length > 0 && (
          <div className="p-5 rounded-2xl bg-deep border border-iron/30">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-cloud mb-3">
              <Shield className="w-4 h-4 text-amber-glow" />
              Guardrail Triggers
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.guardrail_triggers).map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-amber-ghost text-amber-glow border border-amber-glow/20">
                  {k} <span className="text-amber-glow/50">&middot;</span> <span className="font-bold">{v}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Audit log */}
        {audit && (
          <div className="rounded-2xl bg-deep border border-iron/30 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-iron/30 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-cloud">Audit Log</h3>
              <span className="text-[10px] font-mono text-mist/40">{audit.total} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-iron/30">
                    <th className="text-left px-5 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider text-mist/40">Time</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider text-mist/40">Query</th>
                    <th className="text-right px-5 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider text-mist/40">Tokens</th>
                    <th className="text-right px-5 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider text-mist/40">Latency</th>
                    <th className="text-right px-5 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider text-mist/40">Conf</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.entries.map((e) => (
                    <tr key={e.id} className="border-b border-iron/15 hover:bg-white/[0.015] transition-colors">
                      <td className="px-5 py-2.5 text-mist/50 whitespace-nowrap font-mono text-[11px]">
                        {new Date(e.timestamp).toLocaleString()}
                      </td>
                      <td className="px-5 py-2.5 text-fog/80 max-w-xs truncate">{e.query}</td>
                      <td className="px-5 py-2.5 text-right font-mono text-cyan-dim/70">{e.tokens_used}</td>
                      <td className="px-5 py-2.5 text-right font-mono text-mist/50">{e.latency_ms}ms</td>
                      <td className="px-5 py-2.5 text-right font-mono">
                        <span className={e.confidence > 0.7 ? "text-green-glow/70" : e.confidence > 0.4 ? "text-amber-glow/70" : "text-rose-glow/70"}>
                          {Math.round(e.confidence * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {audit.total > audit.page_size && (
              <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-iron/30">
                <button
                  onClick={() => loadPage(page - 1)}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg text-mist/30 hover:text-cloud hover:bg-white/[0.03] disabled:opacity-20 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-mono text-mist/40">Page {page}</span>
                <button
                  onClick={() => loadPage(page + 1)}
                  disabled={page * audit.page_size >= audit.total}
                  className="p-1.5 rounded-lg text-mist/30 hover:text-cloud hover:bg-white/[0.03] disabled:opacity-20 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
