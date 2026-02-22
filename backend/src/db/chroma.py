from __future__ import annotations

import chromadb
from src.config import get_settings

_client: chromadb.HttpClient | None = None


def get_chroma_client() -> chromadb.HttpClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = chromadb.HttpClient(
            host=settings.chroma_host,
            port=settings.chroma_port,
        )
    return _client


def get_collection():
    client = get_chroma_client()
    settings = get_settings()
    return client.get_or_create_collection(
        name=settings.chroma_collection,
        metadata={"hnsw:space": "cosine"},
    )
