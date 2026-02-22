from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    Info,
    generate_latest,
    CONTENT_TYPE_LATEST,
)
from starlette.requests import Request
from starlette.responses import Response

# ── App Info ──────────────────────────────────────────────────────────
APP_INFO = Info("helpdesk", "NLQ Helpdesk application metadata")
APP_INFO.info({
    "version": "1.0.0",
    "llm_provider": "google_gemini",
    "vector_db": "chromadb",
    "framework": "fastapi",
})

# ── HTTP Metrics ──────────────────────────────────────────────────────
HTTP_REQUESTS = Counter(
    "helpdesk_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)

HTTP_LATENCY = Histogram(
    "helpdesk_http_request_duration_seconds",
    "HTTP request latency",
    ["method", "endpoint"],
    buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0, 120.0],
)

# ── LLM / RAG Metrics ────────────────────────────────────────────────
LLM_REQUESTS = Counter(
    "helpdesk_llm_requests_total",
    "Total LLM generation requests",
    ["model", "status"],
)

LLM_TOKENS_PROMPT = Counter(
    "helpdesk_llm_tokens_prompt_total",
    "Total prompt (input) tokens consumed",
)

LLM_TOKENS_COMPLETION = Counter(
    "helpdesk_llm_tokens_completion_total",
    "Total completion (output) tokens consumed",
)

LLM_LATENCY = Histogram(
    "helpdesk_llm_latency_seconds",
    "LLM generation latency (seconds)",
    buckets=[0.5, 1.0, 2.0, 3.0, 5.0, 10.0, 20.0, 30.0, 60.0],
)

RAG_RETRIEVAL_LATENCY = Histogram(
    "helpdesk_rag_retrieval_latency_seconds",
    "RAG vector retrieval latency (seconds)",
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0],
)

RAG_RETRIEVAL_SCORE = Histogram(
    "helpdesk_rag_retrieval_score",
    "RAG document relevance scores",
    buckets=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
)

RAG_CHUNKS_RETRIEVED = Histogram(
    "helpdesk_rag_chunks_retrieved",
    "Number of relevant chunks retrieved per query",
    buckets=[0, 1, 2, 3, 4, 5, 7, 10],
)

RESPONSE_CONFIDENCE = Histogram(
    "helpdesk_response_confidence",
    "Response confidence score distribution",
    buckets=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
)

# ── Embedding Metrics ─────────────────────────────────────────────────
EMBEDDING_LATENCY = Histogram(
    "helpdesk_embedding_latency_seconds",
    "Embedding generation latency (seconds)",
    buckets=[0.1, 0.25, 0.5, 1.0, 2.0, 5.0],
)

EMBEDDING_REQUESTS = Counter(
    "helpdesk_embedding_requests_total",
    "Total embedding API requests",
    ["status"],
)

# ── Guardrail Metrics ─────────────────────────────────────────────────
GUARDRAIL_CHECKS = Counter(
    "helpdesk_guardrail_checks_total",
    "Total guardrail checks performed",
    ["type"],
)

GUARDRAIL_BLOCKS = Counter(
    "helpdesk_guardrail_blocks_total",
    "Total requests blocked by guardrails",
    ["type"],
)

GUARDRAIL_FLAGS = Counter(
    "helpdesk_guardrail_flags_total",
    "Total requests flagged (not blocked) by guardrails",
    ["type"],
)

# ── Document / Ingestion Metrics ──────────────────────────────────────
DOCUMENTS_INGESTED = Counter(
    "helpdesk_documents_ingested_total",
    "Total documents ingested",
)

CHUNKS_CREATED = Counter(
    "helpdesk_chunks_created_total",
    "Total chunks created from documents",
)

INGESTION_LATENCY = Histogram(
    "helpdesk_ingestion_latency_seconds",
    "Document ingestion latency (seconds)",
    buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0],
)

# ── Session Metrics ───────────────────────────────────────────────────
ACTIVE_SESSIONS = Gauge(
    "helpdesk_active_sessions",
    "Currently active chat sessions",
)

CONVERSATIONS_TOTAL = Counter(
    "helpdesk_conversations_total",
    "Total conversations started",
)


# ── Prometheus /metrics endpoint ──────────────────────────────────────
async def metrics_endpoint(request: Request) -> Response:
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )
