from pydantic import BaseModel
from datetime import datetime


class AuditEntry(BaseModel):
    id: int
    session_id: str
    query: str
    response: str
    tokens_used: int
    latency_ms: float
    sources: list[str]
    guardrails_triggered: list[str]
    confidence: float
    timestamp: datetime


class AuditLog(BaseModel):
    entries: list[AuditEntry]
    total: int
    page: int
    page_size: int


class AnalyticsSummary(BaseModel):
    total_queries: int
    avg_latency_ms: float
    avg_confidence: float
    total_tokens: int
    guardrail_triggers: dict[str, int]
    queries_today: int
    top_categories: list[dict]


class TokenUsagePoint(BaseModel):
    date: str
    tokens: int
    queries: int


class TokenUsageTimeSeries(BaseModel):
    data: list[TokenUsagePoint]
