from src.config import get_settings


def chunk_text(text: str, chunk_size: int | None = None, overlap: int | None = None) -> list[str]:
    settings = get_settings()
    size = chunk_size or settings.chunk_size
    lap = overlap or settings.chunk_overlap

    text = text.strip()
    if not text:
        return []

    if len(text) <= size:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + size

        if end < len(text):
            # Try to break at paragraph, then sentence, then word boundary
            for sep in ["\n\n", "\n", ". ", " "]:
                idx = text.rfind(sep, start, end)
                if idx > start:
                    end = idx + len(sep)
                    break

        chunks.append(text[start:end].strip())
        start = end - lap if end < len(text) else end

    return [c for c in chunks if c]


def chunk_file(file_path: str) -> list[str]:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    return chunk_text(content)
