from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "NLQ Helpdesk"
    app_version: str = "1.0.0"
    debug: bool = False

    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_embedding_model: str = "gemini-embedding-001"
    gemini_temperature: float = 0.1
    gemini_max_tokens: int = 2048

    # ChromaDB
    chroma_host: str = "localhost"
    chroma_port: int = 8000
    chroma_collection: str = "helpdesk_docs"

    # SQLite
    sqlite_path: str = "data/audit.db"

    # RAG
    rag_top_k: int = 5
    rag_min_score: float = 0.3
    chunk_size: int = 500
    chunk_overlap: int = 50

    # Rate limiting
    rate_limit_rpm: int = 30
    rate_limit_window: int = 60

    # Guardrails
    guardrails_pii_enabled: bool = True
    guardrails_injection_enabled: bool = True
    guardrails_content_filter_enabled: bool = True

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
