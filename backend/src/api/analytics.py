from fastapi import APIRouter, Query

from src.models.audit import AuditLog, AuditEntry, AnalyticsSummary, TokenUsageTimeSeries, TokenUsagePoint
from src.db.sqlite import get_audit_logs, get_analytics_summary, get_token_usage_timeseries

router = APIRouter(tags=["analytics"])


@router.get("/analytics/summary", response_model=AnalyticsSummary)
async def summary():
    data = await get_analytics_summary()
    return AnalyticsSummary(**data)


@router.get("/analytics/audit", response_model=AuditLog)
async def audit_log(page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200)):
    entries, total = await get_audit_logs(page, page_size)
    return AuditLog(
        entries=[AuditEntry(**e) for e in entries],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/analytics/tokens", response_model=TokenUsageTimeSeries)
async def token_usage():
    data = await get_token_usage_timeseries()
    return TokenUsageTimeSeries(data=[TokenUsagePoint(**d) for d in data])
