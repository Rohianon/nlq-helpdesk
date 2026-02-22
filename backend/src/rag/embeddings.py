from google import genai

from src.config import get_settings
from src.observability.logger import get_logger

log = get_logger(__name__)

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        settings = get_settings()
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def embed_texts(texts: list[str]) -> list[list[float]]:
    settings = get_settings()
    client = _get_client()

    all_embeddings = []
    batch_size = 100

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        result = client.models.embed_content(
            model=settings.gemini_embedding_model,
            contents=batch,
        )
        all_embeddings.extend([e.values for e in result.embeddings])

    return all_embeddings


def embed_query(query: str) -> list[float]:
    return embed_texts([query])[0]
