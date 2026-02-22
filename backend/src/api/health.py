from fastapi import APIRouter

from src.db.sqlite import get_db
from src.db.chroma import get_collection

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    checks = {"api": "ok", "sqlite": "ok", "chroma": "ok"}

    try:
        await get_db()
    except Exception:
        checks["sqlite"] = "error"

    try:
        col = get_collection()
        checks["chroma_docs"] = col.count()
    except Exception:
        checks["chroma"] = "error"

    status = "healthy" if all(v == "ok" or isinstance(v, int) for v in checks.values()) else "degraded"
    return {"status": status, **checks}
