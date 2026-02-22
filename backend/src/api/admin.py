from fastapi import APIRouter
from pydantic import BaseModel

from src.db.sqlite import get_guardrail_config, set_guardrail_config
from src.config import get_settings

router = APIRouter(tags=["admin"])


class GuardrailUpdate(BaseModel):
    key: str
    value: bool | str | int | float


@router.get("/admin/guardrails")
async def get_guardrails():
    settings = get_settings()
    db_config = await get_guardrail_config()

    return {
        "pii_enabled": db_config.get("pii_enabled", settings.guardrails_pii_enabled),
        "injection_enabled": db_config.get("injection_enabled", settings.guardrails_injection_enabled),
        "content_filter_enabled": db_config.get("content_filter_enabled", settings.guardrails_content_filter_enabled),
    }


@router.put("/admin/guardrails")
async def update_guardrail(body: GuardrailUpdate):
    await set_guardrail_config(body.key, body.value)
    return {"status": "updated", "key": body.key, "value": body.value}


@router.get("/admin/settings")
async def get_app_settings():
    settings = get_settings()
    return {
        "app_name": settings.app_name,
        "app_version": settings.app_version,
        "gemini_model": settings.gemini_model,
        "rag_top_k": settings.rag_top_k,
        "rag_min_score": settings.rag_min_score,
        "chunk_size": settings.chunk_size,
        "chunk_overlap": settings.chunk_overlap,
        "rate_limit_rpm": settings.rate_limit_rpm,
    }
