from src.config import get_settings
from src.db.chroma import get_collection
from src.rag.embeddings import embed_query
from src.observability.logger import get_logger

log = get_logger(__name__)


def retrieve(query: str) -> list[dict]:
    settings = get_settings()
    collection = get_collection()

    if collection.count() == 0:
        log.info("Collection is empty, skipping retrieval")
        return []

    query_embedding = embed_query(query)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=settings.rag_top_k,
        include=["documents", "metadatas", "distances"],
    )

    docs = []
    for i, doc in enumerate(results["documents"][0]):
        distance = results["distances"][0][i]
        score = 1.0 - distance  # cosine distance → similarity
        metadata = results["metadatas"][0][i] if results["metadatas"] else {}

        if score < settings.rag_min_score:
            continue

        docs.append({
            "text": doc,
            "score": round(score, 4),
            "source": metadata.get("source", "unknown"),
        })

    docs.sort(key=lambda d: d["score"], reverse=True)
    log.info("Retrieved %d relevant chunks for query", len(docs))
    return docs
