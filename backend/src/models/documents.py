from pydantic import BaseModel
from datetime import datetime


class DocumentMetadata(BaseModel):
    id: str
    filename: str
    file_type: str
    chunk_count: int
    uploaded_at: datetime
    size_bytes: int = 0


class DocumentList(BaseModel):
    documents: list[DocumentMetadata]
    total: int


class IngestResult(BaseModel):
    document_id: str
    filename: str
    chunks_created: int
    status: str = "success"


class IngestSampleResult(BaseModel):
    documents_ingested: int
    total_chunks: int
    details: list[IngestResult]
