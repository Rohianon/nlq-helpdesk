import { useState, useEffect } from "react";
import { Loader2, Shield, Settings, CheckCircle, AlertCircle, Activity, Eye, ShieldAlert, Filter, Server, Cpu, Database } from "lucide-react";
import { getGuardrails, updateGuardrail, getAppSettings, healthCheck } from "../lib/api";

function Toggle({ label, description, icon: Icon, enabled, onChange }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-deep border border-iron/30 hover:border-iron/50 transition-all duration-200 group">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors duration-200 ${
          enabled ? "bg-cyan-ghost border-cyan-glow/20" : "bg-slate/50 border-iron/30"
        }`}>
          <Icon className={`w-4 h-4 transition-colors duration-200 ${enabled ? "text-cyan-glow" : "text-mist/30"}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-cloud">{label}</p>
          <p className="text-[11px] text-mist/40 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-6.5 rounded-full transition-all duration-300 border ${
          enabled
            ? "bg-cyan-glow/20 border-cyan-glow/40 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
            : "bg-iron/30 border-iron/50"
        }`}
      >
        <span
          className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full transition-all duration-300 ${
            enabled
              ? "translate-x-[21px] bg-cyan-glow shadow-[0_0_6px_rgba(0,229,255,0.5)]"
              : "bg-mist/30"
          }`}
        />
      </button>
    </div>
  );
}

function HealthStatus({ health }) {
  if (!health) return null;
  const ok = health.status === "healthy";
  return (
    <div className={`p-5 rounded-2xl border ${
      ok ? "bg-green-ghost border-green-glow/20" : "bg-amber-ghost border-amber-glow/20"
    }`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
          ok ? "bg-green-tint border-green-glow/30" : "bg-amber-tint border-amber-glow/30"
        }`}>
          <Activity className={`w-4 h-4 ${ok ? "text-green-glow" : "text-amber-glow"}`} />
        </div>
        <div>
          <span className="font-display text-sm font-semibold text-cloud">System Status</span>
          <p className="text-[10px] font-mono uppercase tracking-wider text-mist/40">
            {ok ? "All systems operational" : "Degraded performance"}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {Object.entries(health)
          .filter(([k]) => k !== "status")
          .map(([k, v]) => {
            const isOk = v === "ok" || typeof v === "number";
            const icons = { api: Server, sqlite: Database, chroma: Cpu };
            const IconComp = icons[k] || Server;
            return (
              <div key={k} className="flex items-center gap-2 p-2.5 rounded-lg bg-void/30">
                <IconComp className={`w-3.5 h-3.5 ${isOk ? "text-green-glow/60" : "text-rose-glow/60"}`} />
                <div>
                  <p className="text-[10px] font-mono uppercase text-mist/40">{k}</p>
                  <p className={`text-xs font-medium ${isOk ? "text-green-glow" : "text-rose-glow"}`}>
                    {typeof v === "number" ? `${v} docs` : String(v)}
                  </p>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [guardrails, setGuardrails] = useState(null);
  const [settings, setSettings] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    Promise.all([getGuardrails(), getAppSettings(), healthCheck()])
      .then(([g, s, h]) => { setGuardrails(g); setSettings(s); setHealth(h); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleGuardrail = async (key, value) => {
    try {
      await updateGuardrail(key, value);
      setGuardrails((prev) => ({ ...prev, [key]: value }));
      showToast(`${key.replace(/_/g, " ")} ${value ? "enabled" : "disabled"}`);
    } catch (e) {
      showToast(e.message, "error");
    }
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
        <h2 className="font-display text-base font-semibold text-cloud">Admin</h2>
        <div className="h-4 w-px bg-iron/50" />
        <span className="text-[10px] font-mono text-mist/50 uppercase tracking-wider">
          System Configuration
        </span>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
        <div className="animate-fade-up">
          <HealthStatus health={health} />
        </div>

        {/* Guardrails */}
        {guardrails && (
          <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-cloud mb-3">
              <Shield className="w-4 h-4 text-cyan-glow" />
              Guardrails
            </h3>
            <div className="space-y-2">
              <Toggle
                icon={Eye}
                label="PII Detection"
                description="Flag emails, phone numbers, SSNs, and credit card numbers"
                enabled={guardrails.pii_enabled}
                onChange={(v) => toggleGuardrail("pii_enabled", v)}
              />
              <Toggle
                icon={ShieldAlert}
                label="Injection Prevention"
                description="Block prompt injection and jailbreak attempts"
                enabled={guardrails.injection_enabled}
                onChange={(v) => toggleGuardrail("injection_enabled", v)}
              />
              <Toggle
                icon={Filter}
                label="Content Filtering"
                description="Block harmful or inappropriate content"
                enabled={guardrails.content_filter_enabled}
                onChange={(v) => toggleGuardrail("content_filter_enabled", v)}
              />
            </div>
          </div>
        )}

        {/* App Settings */}
        {settings && (
          <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-cloud mb-3">
              <Settings className="w-4 h-4 text-mist/40" />
              Configuration
            </h3>
            <div className="rounded-2xl bg-deep border border-iron/30 overflow-hidden">
              {Object.entries(settings).map(([k, v], i) => (
                <div
                  key={k}
                  className={`flex justify-between items-center px-5 py-3 ${
                    i < Object.entries(settings).length - 1 ? "border-b border-iron/15" : ""
                  } hover:bg-white/[0.01] transition-colors`}
                >
                  <span className="text-[11px] text-mist/50">{k.replace(/_/g, " ")}</span>
                  <span className="text-[11px] text-cloud font-mono bg-slate/50 px-2 py-0.5 rounded">
                    {String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm
            shadow-2xl shadow-black/50 border animate-fade-up font-medium ${
            toast.type === "error"
              ? "bg-rose-ghost text-rose-glow border-rose-glow/20"
              : "bg-green-ghost text-green-glow border-green-glow/20"
          }`}
        >
          {toast.type === "error" ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
