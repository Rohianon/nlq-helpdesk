import { useState, useEffect, useRef } from "react";
import { Upload, Trash2, FileText, Database, Loader2, CheckCircle, AlertCircle, HardDrive, Layers, File } from "lucide-react";
import { listDocuments, uploadDocument, ingestSamples, deleteDocument } from "../lib/api";

const FILE_ICONS = {
  ".md": "📝",
  ".txt": "📄",
  ".csv": "📊",
  ".json": "🔧",
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [toast, setToast] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
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

  useEffect(() => { fetchDocs(); }, []);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadDocument(file);
      showToast(`Uploaded ${result.filename} — ${result.chunks_created} chunks created`);
      fetchDocs();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleFileInput = (e) => handleUpload(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files?.[0]);
  };

  const handleIngestSamples = async () => {
    setIngesting(true);
    try {
      const result = await ingestSamples();
      showToast(`Ingested ${result.documents_ingested} documents — ${result.total_chunks} total chunks`);
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
      showToast(`Removed ${filename}`);
      fetchDocs();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const totalChunks = docs.reduce((sum, d) => sum + d.chunk_count, 0);
  const totalSize = docs.reduce((sum, d) => sum + d.size_bytes, 0);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-6 py-3 border-b border-iron/30 glass z-10">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-base font-semibold text-cloud">Documents</h2>
          <div className="h-4 w-px bg-iron/50" />
          <span className="text-[10px] font-mono text-mist/50 uppercase tracking-wider">
            Knowledge Base
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleIngestSamples}
            disabled={ingesting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium
              bg-amber-ghost border border-amber-glow/20 text-amber-glow
              hover:bg-amber-tint hover:border-amber-glow/40
              disabled:opacity-40 transition-all duration-200"
          >
            {ingesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
            Ingest Samples
          </button>
          <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium
            bg-cyan-ghost border border-cyan-glow/20 text-cyan-glow
            hover:bg-cyan-tint hover:border-cyan-glow/40
            transition-all duration-200 cursor-pointer">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload File
            <input ref={fileRef} type="file" accept=".txt,.md,.csv,.json" className="hidden" onChange={handleFileInput} />
          </label>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-mist/30" />
          </div>
        ) : docs.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center h-full text-center transition-all duration-200 ${
              dragOver ? "scale-[1.01]" : ""
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className={`w-full max-w-md p-12 rounded-2xl border-2 border-dashed transition-all duration-300 ${
              dragOver ? "border-cyan-glow/50 bg-cyan-ghost" : "border-iron/30 bg-deep/50"
            }`}>
              <HardDrive className={`w-12 h-12 mx-auto mb-4 transition-colors ${
                dragOver ? "text-cyan-glow" : "text-iron"
              }`} />
              <h3 className="font-display text-base font-semibold text-cloud">No documents yet</h3>
              <p className="text-xs text-mist/50 mt-2 leading-relaxed">
                Drop files here, upload manually, or ingest the built-in sample data to populate your knowledge base.
              </p>
              <p className="text-[10px] font-mono text-mist/30 mt-4">
                Supports: .txt, .md, .csv, .json
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            {/* Stats bar */}
            <div className="flex gap-3 stagger">
              <div className="flex-1 p-3 rounded-xl bg-deep border border-iron/30">
                <div className="flex items-center gap-2">
                  <File className="w-3.5 h-3.5 text-cyan-dim" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-mist/40">Documents</span>
                </div>
                <p className="font-display text-xl font-bold text-cloud mt-1">{docs.length}</p>
              </div>
              <div className="flex-1 p-3 rounded-xl bg-deep border border-iron/30">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-amber-dim" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-mist/40">Total Chunks</span>
                </div>
                <p className="font-display text-xl font-bold text-cloud mt-1">{totalChunks}</p>
              </div>
              <div className="flex-1 p-3 rounded-xl bg-deep border border-iron/30">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5 text-green-glow/70" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-mist/40">Total Size</span>
                </div>
                <p className="font-display text-xl font-bold text-cloud mt-1">{(totalSize / 1024).toFixed(1)} KB</p>
              </div>
            </div>

            {/* Document list */}
            <div className="space-y-1.5 stagger">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="group flex items-center justify-between p-3.5 rounded-xl
                    bg-deep/80 border border-iron/30
                    hover:border-iron/50 hover:bg-deep transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{FILE_ICONS[doc.file_type] || "📄"}</span>
                    <div>
                      <p className="text-sm font-medium text-cloud">{doc.filename}</p>
                      <p className="text-[11px] font-mono text-mist/40 mt-0.5">
                        {doc.chunk_count} chunks &middot; {(doc.size_bytes / 1024).toFixed(1)} KB &middot;{" "}
                        <span className="text-mist/30">{doc.id.slice(0, 8)}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id, doc.filename)}
                    className="p-2 rounded-lg text-mist/20
                      opacity-0 group-hover:opacity-100
                      hover:text-rose-glow hover:bg-rose-ghost
                      transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
