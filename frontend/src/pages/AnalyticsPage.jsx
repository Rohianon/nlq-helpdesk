import { useState, useEffect } from "react";
import { Loader2, TrendingUp, Clock, Shield, Zap, Hash, Calendar } from "lucide-react";
import { getAnalyticsSummary, getAuditLog, getTokenUsage } from "../lib/api";

function StatCard({ icon: Icon, label, value, sub, color = "indigo" }) {
  const colors = {
    indigo: "bg-indigo-600/10 text-indigo-400",
    emerald: "bg-emerald-600/10 text-emerald-400",
    amber: "bg-amber-600/10 text-amber-400",
    rose: "bg-rose-600/10 text-rose-400",
  };
  return (
    <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function TokenChart({ data }) {
  if (!data.length) return null;
  const maxTokens = Math.max(...data.map((d) => d.tokens));

  return (
    <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
      <h3 className="text-sm font-medium mb-4">Token Usage (Last 30 Days)</h3>
      <div className="flex items-end gap-1 h-32">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full bg-indigo-500/30 rounded-t hover:bg-indigo-500/50 transition-colors"
              style={{ height: `${maxTokens ? (d.tokens / maxTokens) * 100 : 0}%`, minHeight: "2px" }}
            />
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs whitespace-nowrap z-10">
              {d.date}: {d.tokens.toLocaleString()} tokens, {d.queries} queries
            </div>
          </div>
        ))}
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
      .then(([s, a, t]) => {
        setSummary(s);
        setAudit(a);
        setTokens(t.data);
      })
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
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="px-6 py-3 border-b border-gray-800 bg-gray-900/50">
        <h2 className="text-base font-semibold">Analytics</h2>
        <p className="text-xs text-gray-500">Usage metrics and audit trail</p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Hash} label="Total Queries" value={summary.total_queries} sub={`${summary.queries_today} today`} color="indigo" />
            <StatCard icon={Clock} label="Avg Latency" value={`${summary.avg_latency_ms}ms`} color="emerald" />
            <StatCard icon={TrendingUp} label="Avg Confidence" value={`${Math.round(summary.avg_confidence * 100)}%`} color="amber" />
            <StatCard icon={Zap} label="Total Tokens" value={summary.total_tokens.toLocaleString()} color="rose" />
          </div>
        )}

        {/* Token chart */}
        <TokenChart data={tokens} />

        {/* Guardrail triggers */}
        {summary && Object.keys(summary.guardrail_triggers).length > 0 && (
          <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              Guardrail Triggers
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.guardrail_triggers).map(([k, v]) => (
                <span key={k} className="px-2.5 py-1 rounded-full text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {k}: {v}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Audit log */}
        {audit && (
          <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-medium">Audit Log</h3>
              <span className="text-xs text-gray-500">{audit.total} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500">
                    <th className="text-left px-4 py-2 font-medium">Time</th>
                    <th className="text-left px-4 py-2 font-medium">Query</th>
                    <th className="text-right px-4 py-2 font-medium">Tokens</th>
                    <th className="text-right px-4 py-2 font-medium">Latency</th>
                    <th className="text-right px-4 py-2 font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.entries.map((e) => (
                    <tr key={e.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                        {new Date(e.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-gray-300 max-w-xs truncate">{e.query}</td>
                      <td className="px-4 py-2 text-right text-gray-400">{e.tokens_used}</td>
                      <td className="px-4 py-2 text-right text-gray-400">{e.latency_ms}ms</td>
                      <td className="px-4 py-2 text-right text-gray-400">
                        {Math.round(e.confidence * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {audit.total > audit.page_size && (
              <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-800">
                <button
                  onClick={() => loadPage(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded text-xs text-gray-400 hover:text-white disabled:opacity-30"
                >
                  Prev
                </button>
                <span className="text-xs text-gray-500">Page {page}</span>
                <button
                  onClick={() => loadPage(page + 1)}
                  disabled={page * audit.page_size >= audit.total}
                  className="px-3 py-1 rounded text-xs text-gray-400 hover:text-white disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
