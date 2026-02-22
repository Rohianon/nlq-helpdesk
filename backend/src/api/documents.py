import uuid
import asyncio
from pathlib import Path
from functools import partial

from fastapi import APIRouter, UploadFile, File, HTTPException

from src.models.documents import DocumentMetadata, DocumentList, IngestResult, IngestSampleResult
from src.rag.pipeline import ingest_document, delete_document_chunks
from src.db.sqlite import save_document_meta, get_documents, delete_document_meta
from src.observability.logger import get_logger

router = APIRouter(tags=["documents"])
log = get_logger(__name__)

ALLOWED_TYPES = {".txt", ".md", ".csv", ".json"}
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent  # backend/../
SAMPLE_DIRS = [
    _PROJECT_ROOT / "data" / "faqs",
    _PROJECT_ROOT / "data" / "knowledge_base",
    _PROJECT_ROOT / "data" / "tickets",
]


async def _ingest_in_thread(doc_id: str, filename: str, content: str) -> int:
    """Run sync embedding/ingestion in a thread pool to avoid blocking the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(ingest_document, doc_id, filename, content))


@router.post("/documents/upload", response_model=IngestResult)
async def upload_document(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    content = (await file.read()).decode("utf-8")
    doc_id = uuid.uuid4().hex[:12]

    chunks_created = await _ingest_in_thread(doc_id, file.filename, content)
    await save_document_meta(doc_id, file.filename, ext, chunks_created, len(content))

    return IngestResult(
        document_id=doc_id,
        filename=file.filename,
        chunks_created=chunks_created,
    )


@router.post("/documents/ingest-samples", response_model=IngestSampleResult)
async def ingest_samples():
    details = []
    total_chunks = 0

    for p in SAMPLE_DIRS:
        if not p.exists():
            continue
        for file in p.iterdir():
            if file.suffix.lower() not in ALLOWED_TYPES:
                continue
            content = file.read_text(encoding="utf-8")
            doc_id = uuid.uuid4().hex[:12]
            chunks = await _ingest_in_thread(doc_id, file.name, content)
            await save_document_meta(doc_id, file.name, file.suffix, chunks, len(content))
            total_chunks += chunks
            details.append(IngestResult(
                document_id=doc_id,
                filename=file.name,
                chunks_created=chunks,
            ))

    return IngestSampleResult(
        documents_ingested=len(details),
        total_chunks=total_chunks,
        details=details,
    )


@router.get("/documents", response_model=DocumentList)
async def list_documents():
    docs = await get_documents()
    items = [DocumentMetadata(**d) for d in docs]
    return DocumentList(documents=items, total=len(items))


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, partial(delete_document_chunks, doc_id))
    await delete_document_meta(doc_id)
    return {"status": "deleted", "document_id": doc_id}
