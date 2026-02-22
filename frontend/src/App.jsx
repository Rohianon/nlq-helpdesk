import { Routes, Route, NavLink } from "react-router-dom";
import { MessageSquare, FileText, BarChart3, Settings, Activity } from "lucide-react";
import ChatPage from "./pages/ChatPage";
import DocumentsPage from "./pages/DocumentsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AdminPage from "./pages/AdminPage";

const NAV = [
  { to: "/", icon: MessageSquare, label: "Chat" },
  { to: "/documents", icon: FileText, label: "Documents" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/admin", icon: Settings, label: "Admin" },
];

export default function App() {
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-400" />
            <h1 className="text-lg font-bold tracking-tight">NLQ Helpdesk</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">AI-Powered IT Support</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-300"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <div className="text-xs text-gray-600 text-center">v1.0.0 &middot; Gemini + RAG</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
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
