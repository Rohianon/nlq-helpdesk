const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// Chat
export const sendMessage = (message, session_id) =>
  request("/chat", {
    method: "POST",
    body: JSON.stringify({ message, session_id }),
  });

export const getHistory = (sessionId) =>
  request(`/chat/history/${sessionId}`);

export const clearHistory = (sessionId) =>
  request(`/chat/history/${sessionId}`, { method: "DELETE" });

// Documents
export const listDocuments = () => request("/documents");

export const uploadDocument = async (file) => {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/documents/upload`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
};

export const ingestSamples = () =>
  request("/documents/ingest-samples", { method: "POST" });

export const deleteDocument = (docId) =>
  request(`/documents/${docId}`, { method: "DELETE" });

// Analytics
export const getAnalyticsSummary = () => request("/analytics/summary");
export const getAuditLog = (page = 1) => request(`/analytics/audit?page=${page}`);
export const getTokenUsage = () => request("/analytics/tokens");

// Admin
export const getGuardrails = () => request("/admin/guardrails");
export const updateGuardrail = (key, value) =>
  request("/admin/guardrails", {
    method: "PUT",
    body: JSON.stringify({ key, value }),
  });
export const getAppSettings = () => request("/admin/settings");

// Health
export const healthCheck = () =>
  fetch("/health").then((r) => r.json());
