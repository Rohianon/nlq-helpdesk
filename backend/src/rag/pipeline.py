import time
import uuid

from google import genai

from src.config import get_settings
from src.db.chroma import get_collection
from src.db.sqlite import save_message, save_audit, get_conversation
from src.rag.chunker import chunk_text
from src.rag.embeddings import embed_texts
from src.rag.retriever import retrieve
from src.models.chat import ChatResponse, Citation
from src.observability.logger import get_logger

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
    chunks = chunk_text(content)
    if not chunks:
        return 0

    collection = get_collection()
    embeddings = embed_texts(chunks)

    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"source": filename, "chunk_index": i, "doc_id": doc_id} for i in range(len(chunks))]

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
    )

    log.info("Ingested %d chunks from %s", len(chunks), filename)
    return len(chunks)


def delete_document_chunks(doc_id: str):
    collection = get_collection()
    try:
        collection.delete(where={"doc_id": doc_id})
    except Exception:
        log.warning("Could not delete chunks for doc %s", doc_id)


async def chat(message: str, session_id: str | None = None,
               guardrails_triggered: list[str] | None = None) -> ChatResponse:
    settings = get_settings()
    start = time.perf_counter()

    if not session_id:
        session_id = uuid.uuid4().hex[:16]

    # Save user message
    await save_message(session_id, "user", message)

    # Get conversation history
    history_rows = await get_conversation(session_id)
    history_lines = []
    for msg in history_rows[-10:]:  # Last 10 messages for context
        history_lines.append(f"{msg['role']}: {msg['content']}")
    history_text = "\n".join(history_lines) if history_lines else "No previous messages."

    # Retrieve relevant context
    context_docs = retrieve(message)
    context_text = "\n\n".join(
        f"[{d['source']}] (score: {d['score']}): {d['text']}" for d in context_docs
    ) if context_docs else "No relevant documents found in knowledge base."

    # Build prompt
    system = SYSTEM_PROMPT.format(context=context_text, history=history_text)

    # Call Gemini
    client = _get_client()
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=message,
        config=genai.types.GenerateContentConfig(
            system_instruction=system,
            temperature=settings.gemini_temperature,
            max_output_tokens=settings.gemini_max_tokens,
        ),
    )

    answer = response.text or "I'm sorry, I couldn't generate a response."
    tokens_used = 0
    if response.usage_metadata:
        tokens_used = (response.usage_metadata.prompt_token_count or 0) + (
            response.usage_metadata.candidates_token_count or 0
        )

    # Build citations
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

    latency_ms = round((time.perf_counter() - start) * 1000, 2)

    # Save assistant response
    citation_dicts = [c.model_dump() for c in citations]
    await save_message(session_id, "assistant", answer, citation_dicts, confidence)

    # Audit log
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
