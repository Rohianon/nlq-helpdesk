import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import { MessageSquare, FileText, BarChart3, Settings, Cpu, Radio } from "lucide-react";
import { useState, useEffect } from "react";
import ChatPage from "./pages/ChatPage";
import DocumentsPage from "./pages/DocumentsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AdminPage from "./pages/AdminPage";

const NAV = [
  { to: "/", icon: MessageSquare, label: "Chat", tag: null },
  { to: "/documents", icon: FileText, label: "Documents", tag: null },
  { to: "/analytics", icon: BarChart3, label: "Analytics", tag: null },
  { to: "/admin", icon: Settings, label: "Admin", tag: null },
];

function StatusDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full rounded-full bg-green-glow opacity-40 pulse-green" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-glow" />
    </span>
  );
}

export default function App() {
  const location = useLocation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-screen bg-void text-fog overflow-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-glow/[0.02] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-amber-glow/[0.015] rounded-full blur-[100px]" />
      </div>

      {/* Sidebar */}
      <aside className="relative w-60 flex flex-col glass border-r border-iron/50 z-10">
        {/* Brand */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-ghost border border-cyan-glow/20 flex items-center justify-center glow-cyan">
              <Cpu className="w-4.5 h-4.5 text-cyan-glow" />
            </div>
            <div>
              <h1 className="font-display text-base font-bold tracking-tight text-cloud">
                NLQ Helpdesk
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-mist/60">
                AI Support System
              </p>
            </div>
          </div>
        </div>

        {/* Divider with gradient */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-cyan-glow/20 to-transparent" />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label, tag }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-cyan-ghost text-cyan-glow"
                    : "text-mist hover:text-cloud hover:bg-white/[0.03]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-cyan-glow shadow-[0_0_8px_rgba(0,229,255,0.5)]" />
                  )}
                  <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2 : 1.5} />
                  <span className="font-display">{label}</span>
                  {tag && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-amber-ghost text-amber-glow font-mono">
                      {tag}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom status */}
        <div className="px-4 py-4 space-y-3">
          <div className="mx-1 h-px bg-gradient-to-r from-transparent via-iron to-transparent" />
          <div className="flex items-center justify-between text-[10px] font-mono text-mist/50">
            <div className="flex items-center gap-1.5">
              <StatusDot />
              <span className="uppercase tracking-wider">Online</span>
            </div>
            <span>
              {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-mist/30 font-mono">
            <Radio className="w-3 h-3" />
            <span>v1.0.0 &middot; Gemini + RAG</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden bg-grid relative">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
}
