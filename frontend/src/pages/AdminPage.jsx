import { useState, useEffect } from "react";
import { Loader2, Shield, Settings, CheckCircle, AlertCircle, Activity } from "lucide-react";
import { getGuardrails, updateGuardrail, getAppSettings, healthCheck } from "../lib/api";

function Toggle({ label, description, enabled, onChange }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900 border border-gray-800">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? "bg-indigo-600" : "bg-gray-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-5" : ""
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
    <div className={`p-4 rounded-xl border ${ok ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"}`}>
      <div className="flex items-center gap-2 mb-2">
        <Activity className={`w-4 h-4 ${ok ? "text-emerald-400" : "text-amber-400"}`} />
        <span className="text-sm font-medium">System: {health.status}</span>
      </div>
      <div className="flex gap-3 text-xs">
        {Object.entries(health)
          .filter(([k]) => k !== "status")
          .map(([k, v]) => (
            <span key={k} className="text-gray-500">
              {k}: <span className={v === "ok" || typeof v === "number" ? "text-emerald-400" : "text-red-400"}>{String(v)}</span>
            </span>
          ))}
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
      .then(([g, s, h]) => {
        setGuardrails(g);
        setSettings(s);
        setHealth(h);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleGuardrail = async (key, value) => {
    try {
      await updateGuardrail(key, value);
      setGuardrails((prev) => ({ ...prev, [key]: value }));
      showToast(`Updated ${key}`);
    } catch (e) {
      showToast(e.message, "error");
    }
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
        <h2 className="text-base font-semibold">Admin</h2>
        <p className="text-xs text-gray-500">System settings and guardrail configuration</p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
        {/* Health */}
        <HealthStatus health={health} />

        {/* Guardrails */}
        {guardrails && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
              <Shield className="w-4 h-4 text-indigo-400" />
              Guardrails
            </h3>
            <div className="space-y-2">
              <Toggle
                label="PII Detection"
                description="Detect and flag emails, phone numbers, SSNs, credit cards"
                enabled={guardrails.pii_enabled}
                onChange={(v) => toggleGuardrail("pii_enabled", v)}
              />
              <Toggle
                label="Injection Prevention"
                description="Block prompt injection attempts"
                enabled={guardrails.injection_enabled}
                onChange={(v) => toggleGuardrail("injection_enabled", v)}
              />
              <Toggle
                label="Content Filtering"
                description="Block harmful or inappropriate content"
                enabled={guardrails.content_filter_enabled}
                onChange={(v) => toggleGuardrail("content_filter_enabled", v)}
              />
            </div>
          </div>
        )}

        {/* App Settings (read-only) */}
        {settings && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
              <Settings className="w-4 h-4 text-gray-400" />
              Application Settings
            </h3>
            <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
              {Object.entries(settings).map(([k, v]) => (
                <div key={k} className="flex justify-between px-4 py-2.5 border-b border-gray-800/50 last:border-0">
                  <span className="text-xs text-gray-500">{k}</span>
                  <span className="text-xs text-gray-300 font-mono">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm shadow-lg border ${
            toast.type === "error"
              ? "bg-red-500/10 text-red-300 border-red-500/30"
              : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
          }`}
        >
          {toast.type === "error" ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
