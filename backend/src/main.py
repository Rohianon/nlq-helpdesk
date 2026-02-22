from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings
from src.db.sqlite import init_db, close_db
from src.db.chroma import get_chroma_client
from src.api import chat, documents, admin, analytics, health
from src.guardrails.middleware import GuardrailsMiddleware
from src.observability.logger import setup_logging
from src.observability.tracer import TracingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    await init_db()
    get_chroma_client()
    yield
    await close_db()


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Latency-Ms"],
)
app.add_middleware(TracingMiddleware)
app.add_middleware(GuardrailsMiddleware)

app.include_router(health.router)
app.include_router(chat.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
