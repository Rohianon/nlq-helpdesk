from pydantic import BaseModel, Field
from datetime import datetime


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str | None = None


class Citation(BaseModel):
    document_name: str
    chunk_text: str
    relevance_score: float


class ChatResponse(BaseModel):
    response: str
    session_id: str
    citations: list[Citation] = []
    confidence: float = 0.0
    tokens_used: int = 0
    latency_ms: float = 0.0
    guardrails_triggered: list[str] = []


class ConversationMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime
    citations: list[Citation] = []
    confidence: float = 0.0


class ConversationHistory(BaseModel):
    session_id: str
    messages: list[ConversationMessage] = []
