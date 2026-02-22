import time
import uuid
import asyncio
from functools import partial

from google import genai

from src.config import get_settings
from src.db.chroma import get_collection
from src.db.sqlite import save_message, save_audit, get_conversation
from src.rag.chunker import chunk_text
from src.rag.embeddings import embed_texts
from src.rag.retriever import retrieve
from src.models.chat import ChatResponse, Citation
from src.observability.logger import get_logger
from src.observability.metrics import (
    LLM_REQUESTS, LLM_TOKENS_PROMPT, LLM_TOKENS_COMPLETION, LLM_LATENCY,
    RAG_RETRIEVAL_LATENCY, RAG_RETRIEVAL_SCORE, RAG_CHUNKS_RETRIEVED,
    RESPONSE_CONFIDENCE, DOCUMENTS_INGESTED, CHUNKS_CREATED, INGESTION_LATENCY,
    EMBEDDING_LATENCY, EMBEDDING_REQUESTS, CONVERSATIONS_TOTAL, ACTIVE_SESSIONS,
)

log = get_logger(__name__)

_client: genai.Client | None = None

SYSTEM_PROMPT = """You are a helpful IT helpdesk assistant. Answer questions using ONLY the provided context.
If the context doesn't contain enough information, say so honestly.
Be concise and professional. Cite the source documents when possible.

Context:
{context}

Conversation history:
{history}
"""


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        settings = get_settings()
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def ingest_document(doc_id: str, filename: str, content: str) -> int:
    ingest_start = time.perf_counter()

    chunks = chunk_text(content)
    if not chunks:
        return 0

    collection = get_collection()

    embed_start = time.perf_counter()
    embeddings = embed_texts(chunks)
    EMBEDDING_LATENCY.observe(time.perf_counter() - embed_start)
    EMBEDDING_REQUESTS.labels(status="success").inc()

    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"source": filename, "chunk_index": i, "doc_id": doc_id} for i in range(len(chunks))]

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
    )

    DOCUMENTS_INGESTED.inc()
    CHUNKS_CREATED.inc(len(chunks))
    INGESTION_LATENCY.observe(time.perf_counter() - ingest_start)

    log.info("Ingested %d chunks from %s", len(chunks), filename)
    return len(chunks)


def delete_document_chunks(doc_id: str):
    collection = get_collection()
    try:
        collection.delete(where={"doc_id": doc_id})
    except Exception:
        log.warning("Could not delete chunks for doc %s", doc_id)


def _sync_retrieve_and_generate(message: str, history_text: str) -> tuple:
    """Run sync retrieval + Gemini call in a thread to avoid blocking the event loop."""
    settings = get_settings()

    # ── Retrieval phase ───────────────────────────────────────────────
    retrieval_start = time.perf_counter()
    context_docs = retrieve(message)
    RAG_RETRIEVAL_LATENCY.observe(time.perf_counter() - retrieval_start)
    RAG_CHUNKS_RETRIEVED.observe(len(context_docs))

    for doc in context_docs:
        RAG_RETRIEVAL_SCORE.observe(doc["score"])

    context_text = "\n\n".join(
        f"[{d['source']}] (score: {d['score']}): {d['text']}" for d in context_docs
    ) if context_docs else "No relevant documents found in knowledge base."

    system = SYSTEM_PROMPT.format(context=context_text, history=history_text)

    # ── Generation phase ──────────────────────────────────────────────
    gen_start = time.perf_counter()
    client = _get_client()
    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=message,
            config=genai.types.GenerateContentConfig(
                system_instruction=system,
                temperature=settings.gemini_temperature,
                max_output_tokens=settings.gemini_max_tokens,
            ),
        )
        LLM_LATENCY.observe(time.perf_counter() - gen_start)
        LLM_REQUESTS.labels(model=settings.gemini_model, status="success").inc()
    except Exception as e:
        LLM_REQUESTS.labels(model=settings.gemini_model, status="error").inc()
        raise

    return response, context_docs


async def chat(message: str, session_id: str | None = None,
               guardrails_triggered: list[str] | None = None) -> ChatResponse:
    settings = get_settings()
    start = time.perf_counter()

    is_new_session = session_id is None
    if not session_id:
        session_id = uuid.uuid4().hex[:16]

    if is_new_session:
        CONVERSATIONS_TOTAL.inc()
        ACTIVE_SESSIONS.inc()

    await save_message(session_id, "user", message)

    history_rows = await get_conversation(session_id)
    history_lines = []
    for msg in history_rows[-10:]:
        history_lines.append(f"{msg['role']}: {msg['content']}")
    history_text = "\n".join(history_lines) if history_lines else "No previous messages."

    # Run sync retrieval + generation in a thread pool
    loop = asyncio.get_event_loop()
    response, context_docs = await loop.run_in_executor(
        None, partial(_sync_retrieve_and_generate, message, history_text)
    )

    answer = response.text or "I'm sorry, I couldn't generate a response."
    prompt_tokens = 0
    completion_tokens = 0
    if response.usage_metadata:
        prompt_tokens = response.usage_metadata.prompt_token_count or 0
        completion_tokens = response.usage_metadata.candidates_token_count or 0
        LLM_TOKENS_PROMPT.inc(prompt_tokens)
        LLM_TOKENS_COMPLETION.inc(completion_tokens)
    tokens_used = prompt_tokens + completion_tokens

    citations = [
        Citation(
            document_name=d["source"],
            chunk_text=d["text"][:200],
            relevance_score=d["score"],
        )
        for d in context_docs[:3]
    ]

    confidence = round(
        sum(d["score"] for d in context_docs) / len(context_docs), 3
    ) if context_docs else 0.0
    RESPONSE_CONFIDENCE.observe(confidence)

    latency_ms = round((time.perf_counter() - start) * 1000, 2)

    citation_dicts = [c.model_dump() for c in citations]
    await save_message(session_id, "assistant", answer, citation_dicts, confidence)

    triggered = guardrails_triggered or []
    sources = [d["source"] for d in context_docs]
    await save_audit(
        session_id=session_id,
        query=message,
        response=answer,
        tokens_used=tokens_used,
        latency_ms=latency_ms,
        sources=sources,
        guardrails_triggered=triggered,
        confidence=confidence,
    )

    return ChatResponse(
        response=answer,
        session_id=session_id,
        citations=citations,
        confidence=confidence,
        tokens_used=tokens_used,
        latency_ms=latency_ms,
        guardrails_triggered=triggered,
    )
