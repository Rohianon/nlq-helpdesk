import { useState, useEffect, useRef } from "react";
import { Upload, Trash2, FileText, Database, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { listDocuments, uploadDocument, ingestSamples, deleteDocument } from "../lib/api";

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchDocs = async () => {
    try {
      const data = await listDocuments();
      setDocs(data.documents);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadDocument(file);
      showToast(`Uploaded ${result.filename} (${result.chunks_created} chunks)`);
      fetchDocs();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleIngestSamples = async () => {
    setIngesting(true);
    try {
      const result = await ingestSamples();
      showToast(
        `Ingested ${result.documents_ingested} documents (${result.total_chunks} chunks)`
      );
      fetchDocs();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setIngesting(false);
    }
  };

  const handleDelete = async (docId, filename) => {
    try {
      await deleteDocument(docId);
      showToast(`Deleted ${filename}`);
      fetchDocs();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900/50">
        <div>
          <h2 className="text-base font-semibold">Documents</h2>
          <p className="text-xs text-gray-500">
            Manage knowledge base documents for RAG retrieval
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleIngestSamples}
            disabled={ingesting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-600/30 transition-colors disabled:opacity-50"
          >
            {ingesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
            Ingest Samples
          </button>
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-600/30 transition-colors cursor-pointer">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.csv,.json"
              className="hidden"
              onChange={handleUpload}
            />
          </label>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="w-12 h-12 text-gray-700 mb-3" />
            <h3 className="text-sm font-medium text-gray-400">No documents yet</h3>
            <p className="text-xs text-gray-600 mt-1">
              Upload files or ingest sample data to get started
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-2">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-600/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{doc.filename}</p>
                    <p className="text-xs text-gray-500">
                      {doc.chunk_count} chunks &middot;{" "}
                      {(doc.size_bytes / 1024).toFixed(1)} KB &middot;{" "}
                      {doc.file_type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id, doc.filename)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
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
          {toast.type === "error" ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
