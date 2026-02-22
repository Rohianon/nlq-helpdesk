import json
import aiosqlite
from pathlib import Path
from src.config import get_settings

_db: aiosqlite.Connection | None = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        raise RuntimeError("Database not initialized")
    return _db


async def init_db():
    global _db
    settings = get_settings()
    db_path = Path(settings.sqlite_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    _db = await aiosqlite.connect(str(db_path))
    _db.row_factory = aiosqlite.Row
    await _db.execute("PRAGMA journal_mode=WAL")
    await _db.execute("PRAGMA foreign_keys=ON")

    await _db.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS conversation_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            citations TEXT DEFAULT '[]',
            confidence REAL DEFAULT 0.0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            query TEXT NOT NULL,
            response TEXT NOT NULL,
            tokens_used INTEGER DEFAULT 0,
            latency_ms REAL DEFAULT 0.0,
            sources TEXT DEFAULT '[]',
            guardrails_triggered TEXT DEFAULT '[]',
            confidence REAL DEFAULT 0.0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            file_type TEXT NOT NULL,
            chunk_count INTEGER DEFAULT 0,
            size_bytes INTEGER DEFAULT 0,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS guardrail_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_conversation_session
            ON conversation_history(session_id);
        CREATE INDEX IF NOT EXISTS idx_audit_timestamp
            ON audit_log(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_session
            ON audit_log(session_id);
    """)
    await _db.commit()


async def close_db():
    global _db
    if _db:
        await _db.close()
        _db = None


async def save_message(session_id: str, role: str, content: str,
                       citations: list | None = None, confidence: float = 0.0):
    db = await get_db()
    await db.execute(
        "INSERT OR IGNORE INTO sessions (id) VALUES (?)",
        (session_id,)
    )
    await db.execute(
        """INSERT INTO conversation_history
           (session_id, role, content, citations, confidence)
           VALUES (?, ?, ?, ?, ?)""",
        (session_id, role, content, json.dumps(citations or []), confidence)
    )
    await db.execute(
        "UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (session_id,)
    )
    await db.commit()


async def get_conversation(session_id: str) -> list[dict]:
    db = await get_db()
    cursor = await db.execute(
        """SELECT role, content, citations, confidence, timestamp
           FROM conversation_history
           WHERE session_id = ?
           ORDER BY timestamp ASC""",
        (session_id,)
    )
    rows = await cursor.fetchall()
    return [
        {
            "role": row["role"],
            "content": row["content"],
            "citations": json.loads(row["citations"]),
            "confidence": row["confidence"],
            "timestamp": row["timestamp"],
        }
        for row in rows
    ]


async def delete_conversation(session_id: str):
    db = await get_db()
    await db.execute("DELETE FROM conversation_history WHERE session_id = ?", (session_id,))
    await db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    await db.commit()


async def save_audit(session_id: str, query: str, response: str,
                     tokens_used: int, latency_ms: float,
                     sources: list[str], guardrails_triggered: list[str],
                     confidence: float):
    db = await get_db()
    await db.execute(
        """INSERT INTO audit_log
           (session_id, query, response, tokens_used, latency_ms,
            sources, guardrails_triggered, confidence)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (session_id, query, response, tokens_used, latency_ms,
         json.dumps(sources), json.dumps(guardrails_triggered), confidence)
    )
    await db.commit()


async def get_audit_logs(page: int = 1, page_size: int = 50) -> tuple[list[dict], int]:
    db = await get_db()
    offset = (page - 1) * page_size

    cursor = await db.execute("SELECT COUNT(*) as cnt FROM audit_log")
    row = await cursor.fetchone()
    total = row["cnt"]

    cursor = await db.execute(
        """SELECT * FROM audit_log
           ORDER BY timestamp DESC
           LIMIT ? OFFSET ?""",
        (page_size, offset)
    )
    rows = await cursor.fetchall()
    entries = []
    for row in rows:
        entries.append({
            "id": row["id"],
            "session_id": row["session_id"],
            "query": row["query"],
            "response": row["response"],
            "tokens_used": row["tokens_used"],
            "latency_ms": row["latency_ms"],
            "sources": json.loads(row["sources"]),
            "guardrails_triggered": json.loads(row["guardrails_triggered"]),
            "confidence": row["confidence"],
            "timestamp": row["timestamp"],
        })
    return entries, total


async def get_analytics_summary() -> dict:
    db = await get_db()

    cursor = await db.execute(
        "SELECT COUNT(*) as cnt, AVG(latency_ms) as avg_lat, "
        "AVG(confidence) as avg_conf, SUM(tokens_used) as total_tok "
        "FROM audit_log"
    )
    row = await cursor.fetchone()
    total = row["cnt"]
    avg_latency = row["avg_lat"] or 0.0
    avg_confidence = row["avg_conf"] or 0.0
    total_tokens = row["total_tok"] or 0

    cursor = await db.execute(
        "SELECT COUNT(*) as cnt FROM audit_log WHERE date(timestamp) = date('now')"
    )
    row = await cursor.fetchone()
    today = row["cnt"]

    cursor = await db.execute("SELECT guardrails_triggered FROM audit_log")
    rows = await cursor.fetchall()
    triggers: dict[str, int] = {}
    for row in rows:
        for t in json.loads(row["guardrails_triggered"]):
            triggers[t] = triggers.get(t, 0) + 1

    return {
        "total_queries": total,
        "avg_latency_ms": round(avg_latency, 2),
        "avg_confidence": round(avg_confidence, 3),
        "total_tokens": total_tokens,
        "guardrail_triggers": triggers,
        "queries_today": today,
        "top_categories": [],
    }


async def get_token_usage_timeseries() -> list[dict]:
    db = await get_db()
    cursor = await db.execute(
        """SELECT date(timestamp) as date,
                  SUM(tokens_used) as tokens,
                  COUNT(*) as queries
           FROM audit_log
           GROUP BY date(timestamp)
           ORDER BY date ASC
           LIMIT 30"""
    )
    rows = await cursor.fetchall()
    return [
        {"date": row["date"], "tokens": row["tokens"], "queries": row["queries"]}
        for row in rows
    ]


async def save_document_meta(doc_id: str, filename: str, file_type: str,
                             chunk_count: int, size_bytes: int):
    db = await get_db()
    await db.execute(
        """INSERT OR REPLACE INTO documents
           (id, filename, file_type, chunk_count, size_bytes)
           VALUES (?, ?, ?, ?, ?)""",
        (doc_id, filename, file_type, chunk_count, size_bytes)
    )
    await db.commit()


async def get_documents() -> list[dict]:
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM documents ORDER BY uploaded_at DESC"
    )
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


async def delete_document_meta(doc_id: str):
    db = await get_db()
    await db.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    await db.commit()


async def get_guardrail_config() -> dict:
    db = await get_db()
    cursor = await db.execute("SELECT key, value FROM guardrail_config")
    rows = await cursor.fetchall()
    config = {}
    for row in rows:
        try:
            config[row["key"]] = json.loads(row["value"])
        except (json.JSONDecodeError, TypeError):
            config[row["key"]] = row["value"]
    return config


async def set_guardrail_config(key: str, value):
    db = await get_db()
    await db.execute(
        """INSERT OR REPLACE INTO guardrail_config (key, value, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)""",
        (key, json.dumps(value))
    )
    await db.commit()
